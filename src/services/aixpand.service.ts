import { AiXpandNetworkGateway } from '../interfaces/aixpand.network.gateway';
import { MessageMappingProperties } from '../interfaces/message.mapping.properties';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { AiXpandClient, AiXpandClientEventContext, AiXpandEventType, AiXPMessage } from '@aixpand/client';
import { fromEvent } from 'rxjs';
import { MetadataExplorerService } from './metadata.explorer.service';
import { DEFAULT_CLIENT_NAME } from '../aixpand.constants';

@Injectable()
export class AiXpandService {
    private readonly logger = new Logger(AiXpandService.name, {
        timestamp: true,
    });

    constructor(
        @Inject(DEFAULT_CLIENT_NAME) private readonly client: AiXpandClient,
        private readonly explorerService: MetadataExplorerService,
    ) {}

    public subscribe() {
        // TODO: implement lifecycle hooks (connect, disconnect, etc)

        this.explorerService.extractGateways().forEach((instance: AiXpandNetworkGateway) => {
            const allHandlers = this.explorerService.exploreGateway(instance);

            this.subscribePayloads(
                this.client,
                instance,
                allHandlers.filter((handler) => handler.type === 'payload'),
            );
            this.subscribeStreams(
                this.client,
                instance,
                allHandlers.filter((handler) => handler.type != 'payload'),
            );
            this.printSubscriptionLogs(instance, allHandlers);
        });

        this.explorerService.extractRequireClients().forEach((instance) => {
            this.assignClientToProperties(instance);
        });
    }

    private subscribeStreams(
        client: AiXpandClient,
        instance: AiXpandNetworkGateway,
        subscribersMap: MessageMappingProperties[],
    ) {
        const handlers = subscribersMap.map(({ callback, signature }) => ({
            signature,
            callback: callback.bind(instance),
        }));

        handlers.forEach(({ signature, callback }) => {
            client.getStream(<AiXpandEventType>signature).subscribe((message: AiXPMessage<any>) => {
                callback(message);
            });
        });
    }

    private subscribePayloads(
        client: AiXpandClient,
        instance: AiXpandNetworkGateway,
        subscribersMap: MessageMappingProperties[],
    ) {
        const handlers = subscribersMap.map(({ callback, signature, paramOrder }) => ({
            signature,
            paramOrder,
            callback: callback.bind(instance),
        }));

        handlers.forEach(({ signature, paramOrder, callback }) => {
            fromEvent(client, signature).subscribe(([executionContext, err, data]) => {
                const { context, payload, error } = paramOrder;
                const args = [];

                if (context !== null) {
                    args[context] = <AiXpandClientEventContext>executionContext;
                }
                if (payload !== null) {
                    args[payload] = data;
                }
                if (error !== null) {
                    args[error] = err;
                }

                callback(...args);
            });
        });
    }

    private assignClientToProperties(instance: any) {
        for (const propertyKey of this.explorerService.scanForClientHooks(instance)) {
            Reflect.set(instance, propertyKey, this.client);
        }
    }

    private printSubscriptionLogs(instance: AiXpandNetworkGateway, subscribersMap: MessageMappingProperties[]) {
        // eslint-disable-next-line @typescript-eslint/ban-types
        const gatewayClassName = (instance as Object)?.constructor?.name;
        if (!gatewayClassName) {
            return;
        }
        subscribersMap.forEach(({ signature }) =>
            this.logger.log(`${gatewayClassName} subscribed to the "${signature}" payloads.`),
        );
    }
}
