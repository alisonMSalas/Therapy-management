declare module '@angular/ssr/node' {
  export class AngularNodeAppEngine {
    handle(request: any): Promise<any>;
  }

  export function createNodeRequestHandler(app: any): any;
  export function isMainModule(url: string): boolean;
  export function writeResponseToNodeResponse(response: any, res: any): void;
}


