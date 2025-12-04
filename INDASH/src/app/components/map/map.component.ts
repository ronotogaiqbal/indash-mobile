import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonSpinner, IonFab, IonFabButton, IonIcon } from '@ionic/angular/standalone';
import * as L from 'leaflet';
L.Icon.Default.imagePath = 'assets/';
import { addIcons } from 'ionicons';
import {
  locateOutline,
  searchOutline
} from 'ionicons/icons';
import MiniMap from 'leaflet-minimap';
import { SrcSelectComponent } from '../src-select/src-select.component';
import { SqlQueryService, QueryResponse } from '../../api/sql-query.service';
import { CurrentIdService } from 'src/app/current-id';
import { environment } from '../../../environments/environment';
import { SiscropFormulaService, SiscropData } from '../../services/siscrop-formula.service';

// Define layer types for clarity
type BaseLayer = 'osm' | 'satellite';
type OverlayLayer = 'katam' | 'siscrop' | 'sifortuna';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
  standalone: true,
  imports: [CommonModule, SrcSelectComponent, IonSpinner, IonFab, IonFabButton, IonIcon],
})
export class MapComponent implements AfterViewInit {
  private map: L.Map | undefined;
  private miniMap: MiniMap | undefined;

  // --- Layer Definitions ---
  private baseLayers: { [key: string]: L.TileLayer } = {};
  private overLayers: { [key: string]: L.LayerGroup } = {};

  // --- Geolocation State ---
  private userLocationMarker: L.Marker | undefined;
  private userLocationCircle: L.Circle | undefined;

  private dsGroup: L.FeatureGroup = L.featureGroup();
  private lhGroup: L.FeatureGroup = L.featureGroup();

  private defKecaStyle = {
    color: 'black',
    weight: 1.2,
    opacity: 0.6,
    fillColor: 'white',
    fillOpacity: 0,
  };
  private defDesaStyle = {
    color: 'darkgrey',
    weight: 0.8,
    opacity: 0.8,
    fillColor: 'white',
    fillOpacity: 0,
  };
  private defLahanStyle = {
    color: 'darkgreen',
    weight: 0.2,
    opacity: 0.6,
    fillColor: 'darkgreen',
    fillOpacity: 0.2,
  };

  tile11: L.TileLayer | undefined;
  tile12: L.TileLayer | undefined;
  tile13: L.TileLayer | undefined;
  tile14: L.TileLayer | undefined;
  tile15: L.TileLayer | undefined;
  tile16: L.TileLayer | undefined;
  tile17: L.TileLayer | undefined;
  tile18: L.TileLayer | undefined;
  tile19: L.TileLayer | undefined;
  tile21: L.TileLayer | undefined;
  tile31: L.TileLayer | undefined;
  tile32: L.TileLayer | undefined;
  tile33: L.TileLayer | undefined;
  tile34: L.TileLayer | undefined;
  tile35: L.TileLayer | undefined;
  tile36: L.TileLayer | undefined;
  tile51: L.TileLayer | undefined;
  tile52: L.TileLayer | undefined;
  tile53: L.TileLayer | undefined;
  tile61: L.TileLayer | undefined;
  tile62: L.TileLayer | undefined;
  tile63: L.TileLayer | undefined;
  tile64: L.TileLayer | undefined;
  tile65: L.TileLayer | undefined;
  tile71: L.TileLayer | undefined;
  tile72: L.TileLayer | undefined;
  tile73: L.TileLayer | undefined;
  tile74: L.TileLayer | undefined;
  tile75: L.TileLayer | undefined;
  tile76: L.TileLayer | undefined;
  tile81: L.TileLayer | undefined;
  tile82: L.TileLayer | undefined;
  tile91: L.TileLayer | undefined;
  tile92: L.TileLayer | undefined;
  tile93: L.TileLayer | undefined;
  tile94: L.TileLayer | undefined;
  tile95: L.TileLayer | undefined;
  tile96: L.TileLayer | undefined;

  // SISCROP data
  siscropData: SiscropData | null = null;
  siscropAnalysis: any = null;
  siscropLoading = false;
  siscropError: string | null = null;

  // GeoJSON loading state
  geoJsonLoading = false;

  constructor(
    private sqlQueryService: SqlQueryService,
    private currentId: CurrentIdService,
    private siscropFormulaService: SiscropFormulaService
  ) {
    addIcons({
      'locate-outline': locateOutline,
      'search-outline': searchOutline
    });
  }

  ngAfterViewInit() {
    console.log('[MAP] ngAfterViewInit called');
    this.initMap();

    // Use requestIdleCallback for non-critical initialization
    // This allows the browser to render the UI first before loading heavy resources
    const deferredInit = () => {
      console.log('[MAP] Deferred initialization starting');
      this.addMiniMap();
      this.forceMapUpdate();

      // Load admin data first (lightweight)
      console.log('[MAP] About to call loadAdmin()');
      this.loadAdmin();

      // Defer GeoJSON loading until browser is idle
      // GeoJSON is 7.7MB - loading it blocks the main thread
      this.loadGeoJsonDeferred();
    };

    // Use requestIdleCallback if available, otherwise setTimeout
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(deferredInit, { timeout: 500 });
    } else {
      setTimeout(deferredInit, 100);
    }

    this.map?.on('moveend', () => {
      if (this.keca_layer) {
        this.loadDetailedVisibleMap(this.keca_layer);
      }
    });
  }

  /**
   * Load GeoJSON in a deferred manner to not block initial render
   * Uses chunked loading approach for large files
   */
  private loadGeoJsonDeferred(): void {
    console.log('[MAP] Starting deferred GeoJSON load');

    // Show loading indicator
    this.geoJsonLoading = true;
    this.displayMessage('Memuat peta kecamatan...');

    this.fetchGeoJsonFile(
      'assets/lbs_DN_keca.geojson',
      'KDCPUM',
      this.defKecaStyle
    ).then((res) => {
      console.log('[MAP] GeoJSON loaded:', !!res);
      if (res) {
        this.map?.addLayer(res);
        this.keca_layer = res;
        this.displayMessage('Peta kecamatan berhasil dimuat');
      }
      this.geoJsonLoading = false;
    }).catch((err) => {
      console.error('[MAP] Failed to load GeoJSON:', err);
      this.displayMessage('Gagal memuat peta kecamatan');
      this.geoJsonLoading = false;
    });
  }

  /**
   * Initializes the Leaflet map, ensuring Zoom Control is present, and
   * registers geolocation event listeners.
   */
  private initMap(): void {
    if (this.map) return;

    // Initialize map. zoomControl: true ensures the standard zoom control buttons are shown.
    this.map = L.map('leafletMap', {
      center: [-6.1944, 106.8229], // Default center
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
    });

    this.initLayers();
    this.baseLayers['Open Street Map'].addTo(this.map);
    this.overLayers['SISCROP'].addTo(this.map);
    // Add scale control to the map
    this.map.addControl(
      L.control.scale({
        position: 'topleft', // Position of the scale
        metric: true, // Show metric units
        imperial: false, // Hide imperial units
        maxWidth: 200, // Maximum width of the scale bar
      })
    );

    this.map.addControl(
      L.control.zoom({
        position: 'topleft', // Position of the zoom
      })
    );

    this.map.addControl(
      L.control.layers(this.baseLayers, this.overLayers, {
        position: 'topleft',
      })
    );

    // add ds and lhGroup into map
    this.dsGroup?.addTo(this.map);
    this.lhGroup?.addTo(this.map);

    // Register event handlers for geolocation
    this.map.on('locationfound', (e) => this.onLocationFound(e));
    this.map.on('locationerror', (e) => this.onLocationError(e));
  }

  private initLayers(): void {
    // --- Base Layers ---
    this.baseLayers['Open Street Map'] = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        minZoom: 11,
        maxZoom: 16,
      }
    );
    this.baseLayers['ESRI Satellite Imageries'] = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{x}/{y}',
      {
        minZoom: 11,
        maxZoom: 16,
      }
    );
    // --- Overlay Layers ---
    this.tile11 = L.tileLayer(
      'https://scs1.brmpkementan.id/map-tiles/11/{z}/{x}/{y}.png',
      { tms: true, minZoom: 11, maxNativeZoom: 12, maxZoom: 16 }
    );
    this.tile12 = L.tileLayer(
      'https://scs1.brmpkementan.id/map-tiles/12/{z}/{x}/{y}.png',
      { tms: true, minZoom: 11, maxNativeZoom: 12, maxZoom: 16 }
    );
    this.tile13 = L.tileLayer(
      'https://scs1.brmpkementan.id/map-tiles/13/{z}/{x}/{y}.png',
      { tms: true, minZoom: 11, maxNativeZoom: 12, maxZoom: 16 }
    );
    this.tile14 = L.tileLayer(
      'https://scs1.brmpkementan.id/map-tiles/14/{z}/{x}/{y}.png',
      { tms: true, minZoom: 11, maxNativeZoom: 12, maxZoom: 16 }
    );
    this.tile15 = L.tileLayer(
      'https://scs1.brmpkementan.id/map-tiles/15/{z}/{x}/{y}.png',
      { tms: true, minZoom: 11, maxNativeZoom: 12, maxZoom: 16 }
    );
    this.tile16 = L.tileLayer(
      'https://scs1.brmpkementan.id/map-tiles/16/{z}/{x}/{y}.png',
      { tms: true, minZoom: 11, maxNativeZoom: 12, maxZoom: 16 }
    );
    this.tile17 = L.tileLayer(
      'https://scs1.brmpkementan.id/map-tiles/17/{z}/{x}/{y}.png',
      { tms: true, minZoom: 11, maxNativeZoom: 12, maxZoom: 16 }
    );
    this.tile18 = L.tileLayer(
      'https://scs1.brmpkementan.id/map-tiles/18/{z}/{x}/{y}.png',
      { tms: true, minZoom: 11, maxNativeZoom: 12, maxZoom: 16 }
    );
    this.tile19 = L.tileLayer(
      'https://scs1.brmpkementan.id/map-tiles/19/{z}/{x}/{y}.png',
      { tms: true, minZoom: 11, maxNativeZoom: 12, maxZoom: 16 }
    );
    this.tile21 = L.tileLayer(
      'https://scs1.brmpkementan.id/map-tiles/21/{z}/{x}/{y}.png',
      { tms: true, minZoom: 11, maxNativeZoom: 12, maxZoom: 16 }
    );
    this.tile31 = L.tileLayer(
      'https://scs1.brmpkementan.id/map-tiles/31/{z}/{x}/{y}.png',
      { tms: true, minZoom: 11, maxNativeZoom: 12, maxZoom: 16 }
    );
    this.tile32 = L.tileLayer(
      'https://scs1.brmpkementan.id/map-tiles/32/{z}/{x}/{y}.png',
      { tms: true, minZoom: 11, maxNativeZoom: 12, maxZoom: 16 }
    );
    this.tile33 = L.tileLayer(
      'https://scs1.brmpkementan.id/map-tiles/33/{z}/{x}/{y}.png',
      { tms: true, minZoom: 11, maxNativeZoom: 12, maxZoom: 16 }
    );
    this.tile34 = L.tileLayer(
      'https://scs1.brmpkementan.id/map-tiles/34/{z}/{x}/{y}.png',
      { tms: true, minZoom: 11, maxNativeZoom: 12, maxZoom: 16 }
    );
    this.tile35 = L.tileLayer(
      'https://scs1.brmpkementan.id/map-tiles/35/{z}/{x}/{y}.png',
      { tms: true, minZoom: 11, maxNativeZoom: 12, maxZoom: 16 }
    );
    this.tile36 = L.tileLayer(
      'https://scs1.brmpkementan.id/map-tiles/36/{z}/{x}/{y}.png',
      { tms: true, minZoom: 11, maxNativeZoom: 12, maxZoom: 16 }
    );
    this.tile51 = L.tileLayer(
      'https://scs1.brmpkementan.id/map-tiles/51/{z}/{x}/{y}.png',
      { tms: true, minZoom: 11, maxNativeZoom: 12, maxZoom: 16 }
    );
    this.tile52 = L.tileLayer(
      'https://scs1.brmpkementan.id/map-tiles/52/{z}/{x}/{y}.png',
      { tms: true, minZoom: 11, maxNativeZoom: 12, maxZoom: 16 }
    );
    this.tile53 = L.tileLayer(
      'https://scs1.brmpkementan.id/map-tiles/53/{z}/{x}/{y}.png',
      { tms: true, minZoom: 11, maxNativeZoom: 12, maxZoom: 16 }
    );
    this.tile61 = L.tileLayer(
      'https://scs1.brmpkementan.id/map-tiles/61/{z}/{x}/{y}.png',
      { tms: true, minZoom: 11, maxNativeZoom: 12, maxZoom: 16 }
    );
    this.tile62 = L.tileLayer(
      'https://scs1.brmpkementan.id/map-tiles/62/{z}/{x}/{y}.png',
      { tms: true, minZoom: 11, maxNativeZoom: 12, maxZoom: 16 }
    );
    this.tile63 = L.tileLayer(
      'https://scs1.brmpkementan.id/map-tiles/63/{z}/{x}/{y}.png',
      { tms: true, minZoom: 11, maxNativeZoom: 12, maxZoom: 16 }
    );
    this.tile64 = L.tileLayer(
      'https://scs1.brmpkementan.id/map-tiles/64/{z}/{x}/{y}.png',
      { tms: true, minZoom: 11, maxNativeZoom: 12, maxZoom: 16 }
    );
    this.tile65 = L.tileLayer(
      'https://scs1.brmpkementan.id/map-tiles/65/{z}/{x}/{y}.png',
      { tms: true, minZoom: 11, maxNativeZoom: 12, maxZoom: 16 }
    );
    this.tile71 = L.tileLayer(
      'https://scs1.brmpkementan.id/map-tiles/71/{z}/{x}/{y}.png',
      { tms: true, minZoom: 11, maxNativeZoom: 12, maxZoom: 16 }
    );
    this.tile72 = L.tileLayer(
      'https://scs1.brmpkementan.id/map-tiles/72/{z}/{x}/{y}.png',
      { tms: true, minZoom: 11, maxNativeZoom: 12, maxZoom: 16 }
    );
    this.tile73 = L.tileLayer(
      'https://scs1.brmpkementan.id/map-tiles/73/{z}/{x}/{y}.png',
      { tms: true, minZoom: 11, maxNativeZoom: 12, maxZoom: 16 }
    );
    this.tile74 = L.tileLayer(
      'https://scs1.brmpkementan.id/map-tiles/74/{z}/{x}/{y}.png',
      { tms: true, minZoom: 11, maxNativeZoom: 12, maxZoom: 16 }
    );
    this.tile75 = L.tileLayer(
      'https://scs1.brmpkementan.id/map-tiles/75/{z}/{x}/{y}.png',
      { tms: true, minZoom: 11, maxNativeZoom: 12, maxZoom: 16 }
    );
    this.tile76 = L.tileLayer(
      'https://scs1.brmpkementan.id/map-tiles/76/{z}/{x}/{y}.png',
      { tms: true, minZoom: 11, maxNativeZoom: 12, maxZoom: 16 }
    );
    this.tile81 = L.tileLayer(
      'https://scs1.brmpkementan.id/map-tiles/81/{z}/{x}/{y}.png',
      { tms: true, minZoom: 11, maxNativeZoom: 12, maxZoom: 16 }
    );
    this.tile82 = L.tileLayer(
      'https://scs1.brmpkementan.id/map-tiles/82/{z}/{x}/{y}.png',
      { tms: true, minZoom: 11, maxNativeZoom: 12, maxZoom: 16 }
    );
    this.tile91 = L.tileLayer(
      'https://scs1.brmpkementan.id/map-tiles/91/{z}/{x}/{y}.png',
      { tms: true, minZoom: 11, maxNativeZoom: 12, maxZoom: 16 }
    );
    this.tile92 = L.tileLayer(
      'https://scs1.brmpkementan.id/map-tiles/92/{z}/{x}/{y}.png',
      { tms: true, minZoom: 11, maxNativeZoom: 12, maxZoom: 16 }
    );
    this.tile93 = L.tileLayer(
      'https://scs1.brmpkementan.id/map-tiles/93/{z}/{x}/{y}.png',
      { tms: true, minZoom: 11, maxNativeZoom: 12, maxZoom: 16 }
    );
    this.tile94 = L.tileLayer(
      'https://scs1.brmpkementan.id/map-tiles/94/{z}/{x}/{y}.png',
      { tms: true, minZoom: 11, maxNativeZoom: 12, maxZoom: 16 }
    );
    this.tile95 = L.tileLayer(
      'https://scs1.brmpkementan.id/map-tiles/95/{z}/{x}/{y}.png',
      { tms: true, minZoom: 11, maxNativeZoom: 12, maxZoom: 16 }
    );
    this.tile96 = L.tileLayer(
      'https://scs1.brmpkementan.id/map-tiles/96/{z}/{x}/{y}.png',
      { tms: true, minZoom: 11, maxNativeZoom: 12, maxZoom: 16 }
    );

    const groupTiles = L.layerGroup([
      this.tile11,
      this.tile12,
      this.tile13,
      this.tile14,
      this.tile15,
      this.tile16,
      this.tile17,
      this.tile18,
      this.tile19,
      this.tile21,
      this.tile31,
      this.tile32,
      this.tile33,
      this.tile34,
      this.tile35,
      this.tile36,
      this.tile51,
      this.tile52,
      this.tile53,
      this.tile61,
      this.tile62,
      this.tile63,
      this.tile64,
      this.tile65,
      this.tile71,
      this.tile72,
      this.tile73,
      this.tile74,
      this.tile75,
      this.tile76,
      this.tile81,
      this.tile82,
      this.tile91,
      this.tile92,
      this.tile93,
      this.tile94,
      this.tile95,
      this.tile96,
    ]);
    this.overLayers['SISCROP'] = groupTiles;
  }

  // add inset map

  private addMiniMap(): void {
    if (!this.map) return;
    var osm2 = new L.TileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
    );
    this.miniMap = new MiniMap(osm2, {
      //zoomLevelFixed: 6,
      zoomLevelOffset: -6,
      position: 'bottomleft',
      width: 250,
      height: 150,
    });

    this.map.addControl(this.miniMap);

    // Use a small delay to ensure the container is created
    setTimeout(() => {
      const miniMapContainer = this.miniMap?.getContainer();
      if (miniMapContainer) {
        miniMapContainer.style.border = '1px solid black';
        miniMapContainer.style.boxShadow = '0 0 10px rgba(0,0,0,0.8)';
      }
    }, 100);
  }

  // load geojson layer
  keca_layer: L.GeoJSON | any;
  private async fetchGeoJsonFile(
    fGeoJSON: string,
    property: string,
    layer_style: {}
  ): Promise<any> {
    if (!this.map) return;
    //console.log(fGeoJSON);
    const inThis = this;
    return fetch(fGeoJSON)
      .then((response) => {
        if (!response.ok) throw new Error(fGeoJSON);
        return response.json();
      })
      .then((data) => {
        return L.geoJSON(data, {
          onEachFeature(feature, layer: any) {
            if (feature.properties && feature.properties[property]) {
              layer._leaflet_id = parseInt(feature.properties[property]);
              //console.log('A', layer._leaflet_id);
              layer.on('click', (e: L.LeafletEvent) => {
                // show selected polygon
                inThis.keca_layer?.setStyle(inThis.defKecaStyle);
                inThis.dsGroup?.setStyle(inThis.defDesaStyle);
                inThis.lhGroup?.setStyle(inThis.defLahanStyle);
                layer.setStyle({
                  fillOpacity: 0.5,
                });

                // broadcast event  new location ID
                inThis.update_ID(feature.properties[property]);

                // Load SISCROP data for this location
                const locationID = feature.properties[property];
                inThis.loadSiscropData(locationID);

                // query data
                // get up to DESA (10 digits ID)
                const feature_id = feature.properties[property].substring(
                  0,
                  10
                );
                let qRes: any;
                inThis.sqlQuery =
                  'SELECT DISTINCT `t2_admin`.`NAMA` AS `NAMA` FROM `t2_admin` WHERE `t2_admin`.`ID_ADMIN` = ' +
                  feature_id;
                inThis.sqlQueryService
                  .executeQuery(inThis.sqlQuery, inThis.apiURL)
                  .subscribe({
                    next: (response: QueryResponse) => {
                      if (response.status === 'success') {
                        qRes = response.data[0];
                        // set popup
                        layer.bindPopup(`Lokasi: ${qRes.NAMA}`);
                        // show popup
                        layer.openPopup();
                      } else {
                        inThis.error =
                          response.error ||
                          response.message ||
                          'Query execution failed';
                      }
                    },
                    error: (error) => {
                      inThis.isLoading = false;
                      inThis.error = error;
                    },
                  });
              });
            }
          },
          style: function (feature) {
            return layer_style;
          },
        });
      })
      .catch((error) => {
        // Silently skip missing GeoJSON files (some may not exist)
        // Only log if needed for debugging
        // console.warn('GeoJSON file not found:', error.message);
        return null;
      });
  }

  private update_ID(current_ID: string) {
    this.currentId.setCurrentId(current_ID);
  }

  private loadDetailedVisibleMap(feature: L.GeoJSON | any) {
    const bounds = this.map?.getBounds(); // Get current map bounds
    const visibleFeatures: any[] = [];

    feature.eachLayer(
      (layer: { getBounds: () => L.LatLngBoundsExpression; feature: any }) => {
        if (bounds?.intersects(layer.getBounds())) {
          visibleFeatures.push(layer.feature); // Add feature if within bounds
        }
      }
    );

    if (this.dsGroup?.getLayers().length > 0) {
      this.dsGroup?.eachLayer((layer) => {
        const layerWithId = layer as L.Layer & { _leaflet_id?: number };
        var hit = 0;
        for (const feat of visibleFeatures) {
          if (
            String(layerWithId._leaflet_id).substring(0, 6) ===
            feat.properties.KDCPUM
          ) {
            hit = hit + 1;
            break;
          }
        }
        if (hit === 0) this.dsGroup?.removeLayer(layer);
      });
    }

    if (this.lhGroup?.getLayers().length > 0) {
      this.lhGroup?.eachLayer((layer) => {
        const layerWithId = layer as L.Layer & { _leaflet_id?: number };
        var hit = 0;
        for (const feat of visibleFeatures) {
          if (
            String(layerWithId._leaflet_id).substring(0, 6) ===
            feat.properties.KDCPUM
          ) {
            hit = hit + 1;
            break;
          }
        }
        if (hit === 0) this.lhGroup?.removeLayer(layer);
      });
    }
    //this.dsGroup?.clearLayers();
    //this.lhGroup?.clearLayers();

    visibleFeatures.forEach((feat) => {
      //fetch desa
      this.fetchGeoJsonFile(
        `assets/desa/desa_${feat.properties.KDCPUM}.geojson`,
        'ID_DESA',
        this.defDesaStyle
      ).then((res) => {
        if (res) {
          res.eachLayer((lyr: L.Layer) => {
            if (!this.dsGroup.hasLayer(lyr)) this.dsGroup?.addLayer(lyr);
          });
        }
      });
      //fetch lahan
      this.fetchGeoJsonFile(
        `assets/polylahan/lahan_${feat.properties.KDCPUM}.geojson`,
        'ID_LAHAN',
        this.defLahanStyle
      ).then((res) => {
        if (res) {
          res.eachLayer((lyr: L.Layer) => {
            if (!this.lhGroup.hasLayer(lyr)) this.lhGroup?.addLayer(lyr);
          });
        }
      });
    });
  }

  // --- GEOLOCATION METHODS (ADDED) ---

  /**
   * Public method to trigger the browser's GPS request.
   */
  public locateUser(): void {
    if (this.map) {
      // Clear previous location state
      if (this.userLocationMarker) {
        this.map.removeLayer(this.userLocationMarker);
      }
      if (this.userLocationCircle) {
        this.map.removeLayer(this.userLocationCircle);
      }

      this.displayMessage('Memindai lokasi...');
      // Start locating process. setView: true moves the map to the found location.
      this.map.locate({
        setView: true,
        maxZoom: 16,
        timeout: 10000,
        enableHighAccuracy: true,
      });
    }
  }

  private onLocationFound(e: L.LocationEvent): void {
    // Clear the message
    this.displayMessage('Location found!');

    const radius = e.accuracy / 2;
    const latlng = e.latlng;

    // Add marker (now correctly displays the image)
    this.userLocationMarker = L.marker(latlng).addTo(this.map!);
    this.userLocationMarker
      .bindPopup(`Radius ${radius.toFixed(0)} meter`)
      .openPopup();

    // Add circle to represent accuracy
    this.userLocationCircle = L.circle(latlng, {
      radius: radius,
      color: '#007bff',
      fillColor: '#007bff',
      fillOpacity: 0.3,
      weight: 1,
    }).addTo(this.map!);

    // Optionally fit the map bounds to the accuracy circle
    this.map?.fitBounds(this.userLocationCircle.getBounds());
  }

  private onLocationError(e: L.ErrorEvent): void {
    let errorMessage = 'Tidak dapat mendeteksi lokasi.';
    if (e.code === 1) {
      errorMessage += ' Ijin ditolak.';
    } else {
      errorMessage += ` Error: ${e.message}`;
    }
    this.displayMessage(errorMessage);
    console.error('Error Geolokasi:', e.message);
  }

  /**
   * Placeholder for showing an in-app message, as alerts are forbidden.
   * Logs the message to the console for user feedback in this environment.
   */
  private displayMessage(message: string): void {
    console.log(`[MAP STATUS]: ${message}`);
  }

  // --- PUBLIC METHODS (Called by Page) ---

  /**
   * Forces the Leaflet map to recalculate its size, necessary after layout changes.
   */
  public forceMapUpdate(): void {
    if (this.map) {
      this.map.invalidateSize();
    }
  }

  /////////////////////////////////////////// Function to prepare admin data for admin searching
  adminData: any;
  latestq80: any;
  latest: any = [];
  sqlQuery: string = '';
  error: string = '';
  isLoading: boolean = false;
  apiURL: string = environment.apiUrls.siaptanam;
  apiUrlScs1: string = environment.apiUrls.scs1;

  async loadAdmin() {
    console.log('[MAP] loadAdmin() called');
    this.adminData = [];

    // Load only kecamatan (fast query), then generate parent levels in client
    this.sqlQuery =
      'SELECT DISTINCT `t2_admin`.`ID_ADMIN` AS `ID_ADMIN`, `t2_admin`.`NAMA` AS `NAMA` ' +
      'FROM (`t2_admin` LEFT JOIN `t2_kecamatan` ON (`t2_admin`.`ID_ADMIN` = `t2_kecamatan`.`ID_KECA`)) ' +
      'WHERE `t2_kecamatan`.`LBS` > 0 ORDER BY ID_ADMIN';

    console.log('[MAP] Executing query:', this.sqlQuery.substring(0, 100) + '...');
    console.log('[MAP] API URL:', this.apiURL);

    this.sqlQueryService.executeQuery(this.sqlQuery, this.apiURL).subscribe({
      next: (response: QueryResponse) => {
        console.log('[MAP] Query response received:', response.status, 'rows:', response.data?.length);
        this.isLoading = false;
        if (response.status === 'success') {
          const kecamatanData = response.data;
          console.log('[MAP] Processing', kecamatanData.length, 'kecamatan records');

          // Generate parent levels (provinsi, kabupaten) from kecamatan IDs
          const parentMap = new Map<string, {ID_ADMIN: string, NAMA: string}>();

          kecamatanData.forEach((kec: any) => {
            const id = kec.ID_ADMIN;

            // Add provinsi (2 digits)
            const provId = id.substring(0, 2);
            if (!parentMap.has(provId)) {
              parentMap.set(provId, {ID_ADMIN: provId, NAMA: provId}); // Will fetch name later
            }

            // Add kabupaten (4 digits)
            const kabId = id.substring(0, 4);
            if (!parentMap.has(kabId)) {
              parentMap.set(kabId, {ID_ADMIN: kabId, NAMA: kabId}); // Will fetch name later
            }

            // Add kecamatan with label
            kec.NAMA = `[KEC] ${kec.NAMA}`;
          });

          // Fetch names for parent levels
          const parentIds = Array.from(parentMap.keys());
          if (parentIds.length > 0) {
            const nameQuery = `SELECT ID_ADMIN, NAMA FROM t2_admin WHERE ID_ADMIN IN (${parentIds.map(id => `'${id}'`).join(',')})`;

            this.sqlQueryService.executeQuery(nameQuery, this.apiURL).subscribe({
              next: (nameResponse: QueryResponse) => {
                if (nameResponse.status === 'success') {
                  // Update parent names
                  nameResponse.data.forEach((row: any) => {
                    const label = row.ID_ADMIN.length === 2 ? '[PROV]' : '[KAB]';
                    parentMap.set(row.ID_ADMIN, {
                      ID_ADMIN: row.ID_ADMIN,
                      NAMA: `${label} ${row.NAMA}`
                    });
                  });

                  // Combine all data: parents + kecamatan
                  this.adminData = [...Array.from(parentMap.values()), ...kecamatanData];
                  this.adminData.sort((a: any, b: any) => a.ID_ADMIN.localeCompare(b.ID_ADMIN));

                  console.log('[MAP] Loaded admin data:', this.adminData.length, 'locations');
                  console.log('[MAP] Provinsi:', Array.from(parentMap.values()).filter((x: any) => x.ID_ADMIN.length === 2).length);
                  console.log('[MAP] Kabupaten:', Array.from(parentMap.values()).filter((x: any) => x.ID_ADMIN.length === 4).length);
                  console.log('[MAP] Kecamatan:', kecamatanData.length);
                }
              },
              error: (err) => {
                console.error('[MAP] Error loading parent names:', err);
                // Use data without labels
                this.adminData = [...Array.from(parentMap.values()), ...kecamatanData];
              }
            });
          } else {
            this.adminData = kecamatanData;
          }
        } else {
          this.error =
            response.error || response.message || 'Query execution failed';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.error = error;
        console.error('[MAP] Error loading admin data:', error);
      },
    });

    this.sqlQuery = 'SELECT * FROM katam.v2_q80lps_maxyear';
    //this.latestq80 = await this.helperFn.httpRequest('direct', sqlQ);
    this.sqlQuery = 'select * from latest';
    //this.latest = await this.helperFn.httpRequest('direct', sqlQ);
    //this.latest = this.latest[0];

    ///////////////////////////////////////////////////////////////////////////////////////////////THIS IS TEMPORARY ONLY
    //this.latest.MUSIM = 1;
    //this.latest.TAHUN = 2025;
    ///////////////////////////////////////////////////////////////////////////////////////////////THIS IS TEMPORARY ONLY
  }

  ID_ADMIN = '';
  ID_ADMIN_KECA = '';
  NAMA_ADMIN = '';
  itemSelected: [] | any;
  selectChanged(event: any) {
    this.itemSelected = event;
    console.log('[MAP] selectChanged event:', event);

    if (event && event.length > 0) {
      const selected = event[0];
      this.ID_ADMIN = selected.ID_ADMIN;
      this.NAMA_ADMIN = selected.NAMA;

      // Set ID_ADMIN_KECA based on ID length
      const idLength = this.ID_ADMIN.length;
      if (idLength >= 6) {
        this.ID_ADMIN_KECA = this.ID_ADMIN.substring(0, 6);
      } else {
        // For provinsi (2) and kabupaten (4), use the ID itself
        this.ID_ADMIN_KECA = this.ID_ADMIN;
      }

      console.log('[MAP] Selected:', {
        ID_ADMIN: this.ID_ADMIN,
        NAMA: this.NAMA_ADMIN,
        LEVEL: idLength === 2 ? 'Provinsi' : idLength === 4 ? 'Kabupaten' : idLength === 6 ? 'Kecamatan' : 'Desa'
      });

      this.zoomSelected();
    }
  }

  async zoomSelected() {
    if (!this.ID_ADMIN || !this.keca_layer) {
      console.warn('[MAP] No ID_ADMIN or keca_layer available');
      return;
    }

    const idLength = this.ID_ADMIN.length;
    const idAdmin = parseInt(this.ID_ADMIN);
    let targetLayer: any;

    console.log('[MAP] zoomSelected:', this.ID_ADMIN, 'length:', idLength);

    // Handle different administrative levels
    if (idLength === 6) {
      // Kecamatan: use existing layer
      targetLayer = this.keca_layer.getLayer(idAdmin);
      if (targetLayer) {
        this.map?.setView(targetLayer.getBounds().getCenter(), 12);
        targetLayer.fire('click');
      } else {
        console.warn('[MAP] Kecamatan layer not found:', idAdmin);
      }
    } else if (idLength === 2 || idLength === 4) {
      // Provinsi or Kabupaten: find all child kecamatan and zoom to their bounds
      const childLayers: any[] = [];

      this.keca_layer.eachLayer((layer: any) => {
        const layerId = String(layer._leaflet_id);
        // Check if this kecamatan belongs to the selected provinsi/kabupaten
        if (layerId.startsWith(this.ID_ADMIN)) {
          childLayers.push(layer);
        }
      });

      if (childLayers.length > 0) {
        // Calculate combined bounds of all child layers
        const bounds = L.latLngBounds([]);
        childLayers.forEach(layer => {
          bounds.extend(layer.getBounds());
        });

        // Zoom to combined bounds
        const zoomLevel = idLength === 2 ? 8 : 10; // Provinsi: 8, Kabupaten: 10
        this.map?.fitBounds(bounds);
        this.map?.setZoom(zoomLevel);

        // Update current ID to show provinsi/kabupaten data (not first kecamatan)
        this.update_ID(this.ID_ADMIN);

        // Load SISCROP data for this location
        this.loadSiscropData(this.ID_ADMIN);

        console.log('[MAP] Zoomed to', idLength === 2 ? 'provinsi' : 'kabupaten',
                    'with', childLayers.length, 'kecamatan');
      } else {
        console.warn('[MAP] No child kecamatan found for:', this.ID_ADMIN);
      }
    } else if (idLength === 10) {
      // Desa: try to find in dsGroup, or fall back to parent kecamatan
      const kecaId = parseInt(this.ID_ADMIN.substring(0, 6));
      const kecaLayer = this.keca_layer.getLayer(kecaId);

      if (kecaLayer) {
        this.map?.setView(kecaLayer.getBounds().getCenter(), 14);
        kecaLayer.fire('click');

        // Try to find desa layer in dsGroup
        let desaFound = false;
        this.dsGroup.eachLayer((layer: any) => {
          if (layer._leaflet_id === idAdmin) {
            layer.fire('click');
            desaFound = true;
            console.log('[MAP] Found desa layer:', idAdmin);
          }
        });

        if (!desaFound) {
          console.log('[MAP] Desa layer not loaded, showing parent kecamatan');
        }
      }
    }
  }

  /**
   * Load SISCROP data for a specific location from scs1 database
   * Called when clicking on map features or selecting location
   */
  async loadSiscropData(locationID: string): Promise<void> {
    if (!locationID) {
      this.siscropError = 'No location ID provided';
      return;
    }

    this.siscropLoading = true;
    this.siscropError = null;

    try {
      const idLength = locationID.length;
      let tableName = '';
      let idColumn = '';

      // Determine correct SISCROP table name based on location level
      switch (idLength) {
        case 2:  // Province
          tableName = 'q_sc_propinsi';
          idColumn = 'id_bps';
          break;
        case 4:  // District/Kabupaten
          tableName = 'q_sc_kabupaten';
          idColumn = 'id_bps';
          break;
        case 6:  // Sub-district/Kecamatan
          tableName = 'q_sc_kecamatan';
          idColumn = 'id_bps';
          break;
        case 10:  // Village/Desa
          tableName = 'q_sc_desa';
          idColumn = 'id_bps';
          break;
        default:  // National or unsupported
          tableName = 'q_sc_nasional';
          idColumn = 'id_admin';
          break;
      }

      // Query SISCROP data from scs1 database
      const sqlQuery =
        `SELECT id_bps, x0, x1, x2, x3, x4, x5, x6, x7, data_date, lbs, ` +
        `provitas_bps, provitas_sc FROM ${tableName} ` +
        `WHERE ${idColumn} = '${locationID}' ` +
        `ORDER BY data_date DESC LIMIT 1`;

      console.log('[MAP SISCROP Query]', sqlQuery);

      // Execute query on scs1 API
      this.sqlQueryService.executeScs1Query(sqlQuery).subscribe({
        next: (response: QueryResponse) => {
          if (response.status === 'success' && response.data && response.data.length > 0) {
            this.siscropData = response.data[0] as SiscropData;

            // Analyze SISCROP data using formula service
            this.siscropAnalysis = this.siscropFormulaService.analyzeSiscropData(this.siscropData);

            console.log('[MAP SISCROP Data]', this.siscropData);
            console.log('[MAP SISCROP Analysis]', this.siscropAnalysis);

            this.siscropError = null;
            this.siscropLoading = false;
          } else {
            this.siscropError = 'No SISCROP data found for this location';
            this.siscropData = null;
            this.siscropAnalysis = null;
            this.siscropLoading = false;
          }
        },
        error: (error: any) => {
          console.error('[MAP SISCROP Error]', error);
          this.siscropError = error.message || 'Failed to load SISCROP data';
          this.siscropData = null;
          this.siscropAnalysis = null;
          this.siscropLoading = false;
        }
      });
    } catch (error: any) {
      console.error('[MAP SISCROP Error]', error);
      this.siscropError = error.message || 'Failed to load SISCROP data';
      this.siscropData = null;
      this.siscropAnalysis = null;
      this.siscropLoading = false;
    }
  }
}
