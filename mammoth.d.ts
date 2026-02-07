// Type declarations for mammoth module
declare module 'mammoth' {
    interface Message {
        type: 'warning' | 'error';
        message: string;
    }

    interface ExtractResult {
        value: string;
        messages: Message[];
    }

    interface Options {
        arrayBuffer?: ArrayBuffer;
        buffer?: Buffer;
        path?: string;
    }

    export function extractRawText(options: Options): Promise<ExtractResult>;
    export function convertToHtml(options: Options): Promise<ExtractResult>;
}
