export const AiXpandContext = () => (target: any, methodName: string, index: number) => {
    Reflect.defineMetadata(`params:${methodName}:${index}`, 'context', target);
};
