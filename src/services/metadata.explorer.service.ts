import 'reflect-metadata';
import { Injectable } from '@nestjs/common';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { Module } from '@nestjs/core/injector/module';
import { ModulesContainer } from '@nestjs/core/injector/modules-container';
import { MetadataScanner } from '@nestjs/core/metadata-scanner';
import {
    AIXPAND_GATEWAY_METADATA,
    NETWORK_CLIENT_METADATA,
    PAYLOAD_MAPPING_METADATA,
    PAYLOAD_SUBSCRIPTION_METADATA,
    STREAM_MAPPING_METADATA,
    STREAM_SUBSCRIPTION_METADATA,
} from '../aixpand.constants';
import { isFunction, isUndefined } from '@nestjs/common/utils/shared.utils';
import { AiXpandNetworkGateway } from '../interfaces/aixpand.network.gateway';
import { MessageMappingProperties } from '../interfaces/message.mapping.properties';
import { IsObject } from '../utils';

@Injectable()
export class MetadataExplorerService {
    constructor(
        private readonly modulesContainer: ModulesContainer,
        private readonly metadataScanner: MetadataScanner,
    ) {}

    extractRequireClients() {
        const modules = [...this.modulesContainer.values()];
        return this.flatMap(modules, (instance) => {
            return this.filterRequiresClient(instance);
        });
    }

    extractGateways() {
        const modules = [...this.modulesContainer.values()];
        return this.flatMap(modules, (instance) => this.filterProvider(instance, AIXPAND_GATEWAY_METADATA));
    }

    exploreGateway(gateway: AiXpandNetworkGateway): MessageMappingProperties[] {
        const instancePrototype = Object.getPrototypeOf(gateway);

        return this.metadataScanner
            .getAllMethodNames(instancePrototype)
            .map((method) => this.exploreMethodMetadata(instancePrototype, method))
            .filter((metadata) => metadata);
    }

    public exploreMethodMetadata(instancePrototype: object, methodName: string): MessageMappingProperties {
        const callback = instancePrototype[methodName];
        const isPayloadMapping = Reflect.getMetadata(PAYLOAD_MAPPING_METADATA, callback);
        const isNetworkStreamMapping = Reflect.getMetadata(STREAM_MAPPING_METADATA, callback);

        if (isUndefined(isPayloadMapping) && isUndefined(isNetworkStreamMapping)) {
            return null;
        }

        const signature = Reflect.getMetadata(PAYLOAD_SUBSCRIPTION_METADATA, callback);
        const stream = Reflect.getMetadata(STREAM_SUBSCRIPTION_METADATA, callback);
        const paramOrder = {
            error: null,
            payload: null,
            context: null,
        };

        if (signature) {
            const params = Reflect.getMetadata('design:paramtypes', instancePrototype, methodName);

            for (let i = 0; i < params.length; i++) {
                const paramType = Reflect.getMetadata(`params:${methodName}:${i}`, instancePrototype);
                paramOrder[paramType] = i;
            }
        }

        return {
            type: isUndefined(isPayloadMapping) ? 'stream' : 'payload',
            callback,
            signature: isUndefined(isPayloadMapping) ? stream : signature,
            methodName,
            paramOrder,
        };
    }

    public *scanForClientHooks(instance: any): IterableIterator<string> {
        if (!IsObject(instance)) {
            return;
        }
        for (const propertyKey in instance) {
            if (isFunction(propertyKey)) {
                continue;
            }
            const property = String(propertyKey);
            const isServer = Reflect.getMetadata(NETWORK_CLIENT_METADATA, instance, property);
            if (!isUndefined(isServer)) {
                yield property;
            }
        }
    }

    private flatMap(modules: Module[], callback: (instance: InstanceWrapper) => any | undefined) {
        const items = modules
            .map((module) => [...module.providers.values(), ...module.controllers.values()].map(callback))
            .reduce((a, b) => a.concat(b), []);
        return items.filter((element) => !!element);
    }

    private filterRequiresClient(wrapper: InstanceWrapper): any | undefined {
        const { instance } = wrapper;
        if (!instance || !instance.constructor) {
            return undefined;
        }

        let requireClient = false;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for (const hook of this.scanForClientHooks(instance)) {
            requireClient = true;
        }

        return requireClient ? instance : null;
    }

    private filterProvider(wrapper: InstanceWrapper, metadataKey: string): any | undefined {
        const { instance } = wrapper;

        if (!instance) {
            return undefined;
        }

        return this.extractProviderMetadata(instance, metadataKey);
    }

    private extractProviderMetadata(instance: Record<string, any>, metadataKey: string) {
        if (!instance.constructor) {
            return;
        }
        const metadata = Reflect.getMetadata(metadataKey, instance.constructor);

        return metadata ? instance : undefined;
    }
}
