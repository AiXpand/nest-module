export const PluginPayload = () => (target: any, methodName: string, index: number) => {
    Reflect.defineMetadata(`params:${methodName}:${index}`, 'payload', target);
};
