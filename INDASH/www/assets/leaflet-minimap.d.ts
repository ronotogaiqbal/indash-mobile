declare module 'leaflet-minimap' {
  import * as L from 'leaflet';

  class MiniMap extends L.Control {
    constructor(layer: L.Layer, options?: MiniMapOptions);
  }

  interface MiniMapOptions {
    position?: string;
    zoomLevelOffset?: number;
    zoomLevelFixed?: number;
    toggleDisplay?: boolean;
    width?: number;
    height?: number;
    centerFixed?: boolean;
    zoomAnimation?: boolean;
    minimized?: boolean;
  }

  export = MiniMap;
}
