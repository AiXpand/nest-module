import { NETWORK_CLIENT_METADATA } from '../aixpand.constants.js';

/**
 * Attaches the AiXpand Network client to a specific property.
 */
export const NetworkClient = (): PropertyDecorator => {
    return (target: object, propertyKey: string | symbol) => {
        Reflect.set(target, propertyKey, null);
        Reflect.defineMetadata(NETWORK_CLIENT_METADATA, true, target, propertyKey);
    };
};
