export enum MappingType {
    PAYLOAD = 'payload',
    STREAM = 'stream',
    CLIENT_EVENT = 'client-event',
    UNKNOWN = 'unknown',
}

export type MessageMappingProperties = {
    type: MappingType;
    callback: any;
    path: string;
    methodName: string;
    paramOrder: {
        error: number | null;
        context: number | null;
        payload: number | null;
    };
};
