import { AiXpandNetworkGateway } from '../interfaces/aixpand.network.gateway.js';
import { MappingType, MessageMappingProperties } from '../interfaces/message.mapping.properties.js';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { AiXpandClient, AiXpandEventType } from '@aixpand/jsclient';
import { fromEvent } from 'rxjs';
import { MetadataExplorerService } from './metadata.explorer.service.js';
import { DEFAULT_CLIENT_NAME } from '../aixpand.constants.js';

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
                allHandlers.filter((handler) => handler.type === MappingType.PAYLOAD),
            );
            this.subscribeStreams(
                this.client,
                instance,
                allHandlers.filter((handler) => handler.type === MappingType.STREAM),
            );
            this.subscribeClientEvents(
                this.client,
                instance,
                allHandlers.filter((handler) => handler.type === MappingType.CLIENT_EVENT),
            );
            this.printSubscriptionLogs(instance, allHandlers);
        });

        this.explorerService.extractRequireClients().forEach((instance) => {
            this.assignClientToProperties(instance);
        });
    }

    private subscribeClientEvents(
        client: AiXpandClient,
        instance: AiXpandNetworkGateway,
        subscribersMap: MessageMappingProperties[],
    ) {
        const handlers = subscribersMap.map(({ callback, path }) => ({
            path,
            callback: callback.bind(instance),
        }));

        handlers.forEach(({ path, callback }) => {
            // @ts-ignore
            client.on(path, (...args) => {
                callback(...args);
            });
        });
    }

    private subscribeStreams(
        client: AiXpandClient,
        instance: AiXpandNetworkGateway,
        subscribersMap: MessageMappingProperties[],
    ) {
        const handlers = subscribersMap.map(({ callback, path }) => ({
            path,
            callback: callback.bind(instance),
        }));

        handlers.forEach(({ path, callback }) => {
            client.getStream(<AiXpandEventType>path).subscribe((message: any) => {
                callback(message);
            });
        });
    }

    private subscribePayloads(
        client: AiXpandClient,
        instance: AiXpandNetworkGateway,
        subscribersMap: MessageMappingProperties[],
    ) {
        const handlers = subscribersMap.map(({ callback, path, paramOrder }) => ({
            path,
            paramOrder,
            callback: callback.bind(instance),
        }));

        handlers.forEach(({ path, paramOrder, callback }) => {
            // @ts-ignore
            fromEvent(client, path).subscribe(([err, executionContext, data]) => {
                const { context, payload, error } = paramOrder;
                const args = [];

                if (context !== null) {
                    args[context] = executionContext;
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
        subscribersMap.forEach(({ path }) =>
            this.logger.log(`${gatewayClassName} subscribed to the "${path}" payloads.`),
        );
    }
}
