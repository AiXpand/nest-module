import { AiXpandClient, AiXpandClientOptions } from '@aixpand/jsclient';
import { ModuleMetadata, Provider, Type } from '@nestjs/common';

export type AiXpandClientFactory = (options?: AiXpandClientOptions) => Promise<AiXpandClient>;

export type AiXpandModuleOptions = AiXpandClientOptions;

export interface AiXpandOptionsFactory {
    createAiXpandOptions( // TODO: implement this.
        initiator?: string,
    ): Promise<AiXpandClientOptions> | AiXpandClientOptions;
}

export interface AiXpandModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
    name?: string;
    useExisting?: Type<AiXpandOptionsFactory>;
    useClass?: Type<AiXpandOptionsFactory>;
    useFactory?: (...args: any[]) => Promise<AiXpandModuleOptions> | AiXpandModuleOptions;
    clientFactory?: AiXpandClientFactory;
    inject?: any[];
    extraProviders?: Provider[];
}
