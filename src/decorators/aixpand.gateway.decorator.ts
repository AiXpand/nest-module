import 'reflect-metadata';
import { AIXPAND_GATEWAY_METADATA } from '../aixpand.constants';

export const AiXpandGateway = (): ClassDecorator => {
    return (target: object) => {
        Reflect.defineMetadata(AIXPAND_GATEWAY_METADATA, true, target);
    };
};
