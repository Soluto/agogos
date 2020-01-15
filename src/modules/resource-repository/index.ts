export interface ResourceGroup {
    etag?: string;
    schemas: {[name: string]: string};
}

export {fetch, update} from './s3';
export {pollForUpdates} from './stream';