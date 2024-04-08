import { CLIENT_EVENT_MAPPING_METADATA, CLIENT_EVENT_SUBSCRIPTION_METADATA } from '../aixpand.constants.js';

/**
 * @param signature
 * @constructor
 */
export const NetworkClientEvent = <T = string>(signature: T): MethodDecorator => {
    return (target: object, key: string | symbol, descriptor: PropertyDescriptor) => {
        Reflect.defineMetadata(CLIENT_EVENT_MAPPING_METADATA, true, descriptor.value);
        Reflect.defineMetadata(CLIENT_EVENT_SUBSCRIPTION_METADATA, signature, descriptor.value);
        return descriptor;
    };
};
