export const PluginError = () => (target: any, methodName: string, index: number) => {
    Reflect.defineMetadata(`params:${methodName}:${index}`, 'error', target);
};
