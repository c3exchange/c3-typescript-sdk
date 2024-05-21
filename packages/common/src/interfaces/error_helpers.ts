export interface ClientErrorDefinition {
    id: number;
    statusCode: number;
    message: string;
}

const clientErrorDefinition = (statusCode: number, id: number, message: string): ClientErrorDefinition => {
    return { statusCode, id, message }
}

export const badRequestClientError = (id: number, message: string): ClientErrorDefinition => {
    return clientErrorDefinition(400, id, message)
}

export const tooManyRequestsError = (id: number, message: string): ClientErrorDefinition => {
    return clientErrorDefinition(429, id, message)
}

export interface IClientError {
    statusCode: number
    code: number
    message: string
}
export class ClientError extends Error implements IClientError{
    protected constructor(message: string, public code: number, public statusCode: number) {
        super(message);
    }

    static create(error: ClientErrorDefinition, ...args: any){
        if(error === undefined)
            return new ClientError("Error not defined", 0, 400)
        const formattedMessage = args?.length > 0 ? formatErrorTemplate(error.message, ...args) : error.message
        return  new ClientError(formattedMessage, error.id, error.statusCode)
    }
}

function formatErrorTemplate(template: string, ...values: any): string {
    return template.replace(/{(\d+)}/g, (match, index) => {
        return typeof values[index] !== 'undefined' ? values[index] : match;
    });
}

export const newClientError = (error: ClientErrorDefinition, ...args: any): ClientError => {
    return ClientError.create(error, args)
}
