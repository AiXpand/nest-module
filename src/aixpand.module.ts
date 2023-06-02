import {
    DynamicModule,
    Global,
    Logger,
    Module,
    OnApplicationBootstrap,
    OnApplicationShutdown,
    Provider,
    Type,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { AiXpandClientOptions, AiXpandClient, AiXpandClientEvent } from '@aixpand/client';
import { AIXPAND_MODULE_ID, AIXPAND_MODULE_OPTIONS, DEFAULT_CLIENT_NAME } from './aixpand.constants';
import {
    AiXpandClientFactory,
    AiXpandModuleAsyncOptions,
    AiXpandModuleOptions,
    AiXpandOptionsFactory,
} from './interfaces/aixpand.module.interfaces';
import { defer, lastValueFrom } from 'rxjs';
import { AiXpandService } from './services/aixpand.service';
import { MetadataExplorerService } from './services/metadata.explorer.service';
import { MetadataScanner } from '@nestjs/core/metadata-scanner';
import { v4 as uuid } from 'uuid';

@Global()
@Module({
    providers: [AiXpandService, MetadataExplorerService, MetadataScanner],
})
export class AiXpandModule implements OnApplicationShutdown, OnApplicationBootstrap {
    private static readonly logger = new Logger('AiXpandModule');

    constructor(private readonly networkService: AiXpandService, private readonly moduleRef: ModuleRef) {}

    onApplicationBootstrap(): any {
        this.networkService.subscribe();
    }

    static register(options: AiXpandModuleOptions): DynamicModule {
        const aiXpandModuleOptions = {
            provide: AIXPAND_MODULE_OPTIONS,
            useValue: options,
        };

        const networkClientProvider = {
            provide: DEFAULT_CLIENT_NAME,
            useFactory: async () => await this.createNetworkClientFactory(options),
        };

        const providers = [networkClientProvider, aiXpandModuleOptions];
        const exports = [networkClientProvider];

        return {
            module: AiXpandModule,
            providers,
            exports,
        };
    }

    static registerAsync(options: AiXpandModuleAsyncOptions): DynamicModule {
        const networkClientProvider = {
            provide: DEFAULT_CLIENT_NAME,
            useFactory: async (aiXpandOptions: AiXpandModuleOptions) => {
                if (options.name) {
                    return await this.createNetworkClientFactory(
                        {
                            ...aiXpandOptions,
                            name: options.name,
                        },
                        options.clientFactory,
                    );
                }

                return await this.createNetworkClientFactory(aiXpandOptions, options.clientFactory);
            },
            inject: [AIXPAND_MODULE_OPTIONS],
        };

        const asyncProviders = this.createAsyncProviders(options);
        const providers = [
            ...asyncProviders,
            networkClientProvider,
            {
                provide: AIXPAND_MODULE_ID,
                useValue: uuid(),
            },
            ...(options.extraProviders || []),
        ];
        // eslint-disable-next-line @typescript-eslint/ban-types
        const exports: Array<Provider | Function> = [networkClientProvider];

        return {
            module: AiXpandModule,
            imports: options.imports,
            providers,
            exports,
        };
    }

    async onApplicationShutdown(): Promise<any> {
        const client = this.moduleRef.get<AiXpandClient>(DEFAULT_CLIENT_NAME);
        try {
            if (client) {
                await client.shutdown();
            }
        } catch (e) {
            AiXpandModule.logger.error(e?.message);
        }
    }

    private static createAsyncProviders(options: AiXpandModuleAsyncOptions): Provider[] {
        if (options.useExisting || options.useFactory) {
            return [this.createAsyncOptionsProvider(options)];
        }
        const useClass = options.useClass as Type<AiXpandOptionsFactory>;
        return [
            this.createAsyncOptionsProvider(options),
            {
                provide: useClass,
                useClass,
            },
        ];
    }

    private static createAsyncOptionsProvider(options: AiXpandModuleAsyncOptions): Provider {
        if (options.useFactory) {
            return {
                provide: AIXPAND_MODULE_OPTIONS,
                useFactory: options.useFactory,
                inject: options.inject || [],
            };
        }

        const inject = [(options.useClass || options.useExisting) as Type<AiXpandOptionsFactory>];

        return {
            provide: AIXPAND_MODULE_OPTIONS,
            useFactory: async (optionsFactory: AiXpandOptionsFactory) =>
                await optionsFactory.createAiXpandOptions(options.name), // TODO: implement this and test
            inject,
        };
    }

    private static async createNetworkClientFactory(
        options: AiXpandModuleOptions,
        clientFactory?: AiXpandClientFactory,
    ) {
        const createAiXpandClient =
            clientFactory ??
            ((options: AiXpandModuleOptions) => {
                const client = new AiXpandClient(options as AiXpandClientOptions);
                client.boot();

                this.attachLifecycleCallbacks(client);

                return client;
            });

        return await lastValueFrom(
            defer(async () => {
                return createAiXpandClient(options as AiXpandClientOptions);
            }),
        );
    }

    private static attachLifecycleCallbacks(client: AiXpandClient) {
        client.on(AiXpandClientEvent.AIXP_CLIENT_CONNECTED, (data) => {
            this.logger.log(`Succesfully connected to upstream: ${data.upstream}`);
        });

        client.on(AiXpandClientEvent.AIXP_CLIENT_BOOTED, () => {
            this.logger.log('AiXpand Network client successfully booted.');
        });

        client.on(AiXpandClientEvent.AIXP_CLIENT_SHUTDOWN, () => {
            this.logger.log('AiXpand Network client successfully shutdown.');
        });

        client.on(AiXpandClientEvent.AIXP_ENGINE_OFFLINE, (data) => {
            this.logger.warn(`Execution Engine OFFLINE: ${data.executionEngine}`);
        });

        client.on(AiXpandClientEvent.AIXP_ENGINE_REGISTERED, (status) => {
            this.logger.log(`Successfully REGISTERED new Execution Engine: ${status.executionEngine}`);
        });

        client.on(AiXpandClientEvent.AIXP_ENGINE_DEREGISTERED, (status) => {
            this.logger.log(`Successfully DEREGISTERED Execution Engine: ${status.executionEngine}`);
        });

        client.on(AiXpandClientEvent.AIXP_CLIENT_SYS_TOPIC_SUBSCRIBE, (err, data) => {
            if (err) {
                this.logger.error(err.message, JSON.stringify(err));

                return;
            }

            this.logger.log(
                `Successfully subscribed to network topic "${data.topic}" for "${data.event}" network events.`,
            );
        });

        client.on(AiXpandClientEvent.AIXP_CLIENT_SYS_TOPIC_UNSUBSCRIBE, (err, data) => {
            if (err) {
                this.logger.error(err.message, JSON.stringify(err));

                return;
            }

            this.logger.log(
                `Successfully unsubscribed from network topic "${data.topic}" for "${data.event}" network events.`,
            );
        });
    }
}
