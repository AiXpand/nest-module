import { PAYLOAD_MAPPING_METADATA, PAYLOAD_SUBSCRIPTION_METADATA } from '../aixpand.constants';

/**
 * Subscribe to AiXpand Network PluginInstance payload.
 *
 * @param signature
 * @constructor
 */
export const InstancePayload = <T = string>(signature: T): MethodDecorator => {
    return (target: object, key: string | symbol, descriptor: PropertyDescriptor) => {
        Reflect.defineMetadata(PAYLOAD_MAPPING_METADATA, true, descriptor.value);
        Reflect.defineMetadata(PAYLOAD_SUBSCRIPTION_METADATA, signature, descriptor.value);
        return descriptor;
    };
};
