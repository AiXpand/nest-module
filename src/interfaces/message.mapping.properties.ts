export type MessageMappingProperties = {
    type: string;
    callback: any;
    signature: string;
    methodName: string;
    paramOrder: {
        error: number | null;
        context: number | null;
        payload: number | null;
    };
};
