import {
  Component,
  ViewChild,
  AfterViewInit,
  OnInit,
  OnDestroy,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonFooter,
  IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
  IonGrid, IonRow, IonCol,
  IonList, IonItem, IonLabel, IonNote,
  IonTabs, IonTab, IonTabBar, IonTabButton,
  IonButton, IonButtons, IonIcon, IonSpinner, IonBadge,
  IonFab, IonFabButton,
  IonModal, IonAccordion, IonAccordionGroup,
  IonProgressBar, IonText
} from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { MapComponent } from '../components/map/map.component';
import Chart from 'chart.js/auto'; // Import Chart.js
import { QueryResponse, SqlQueryService } from '../api/sql-query.service';
import { SidePanelComponent, BottomSheetState } from '../components/side-panel/side-panel.component';
import { addIcons } from 'ionicons';
import {
  informationCircleOutline,
  close,
  alertCircle,
  calendar,
  leaf,
  water,
  checkmarkCircle,
  warning,
  bug,
  trendingDown,
  barChart,
  location,
  business,
  map as mapIcon,
  globe,
  eye,
  albums,
  construct
} from 'ionicons/icons';
import { CurrentIdService } from 'src/app/current-id';
import {
  EMPTY,
  firstValueFrom,
  forkJoin,
  map,
  merge,
  Observable,
  switchMap,
  Subject,
} from 'rxjs';
import { HelperFnService } from '../helper-fn.service';
import { SiscropFormulaService, SiscropData } from '../services/siscrop-formula.service';
import { RightPanelDataService } from '../services/right-panel-data.service';
import {
  SiscropDisplayData,
  KatamDisplayData,
  SifortunaDisplayData,
  SummaryData,
  RightPanelState,
  DataAvailabilityInfo,
  LocationLevel,
  Tab3IrrigationData,
  MobileLocationInfoData
} from '../models/right-panel.models';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { QueryMetadata, DebugQueryButtonComponent } from '../components/debug-query-button/debug-query-button.component';
import { ScreenService } from '../services/screen.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MapComponent,
    SidePanelComponent,
    DebugQueryButtonComponent,
    // Ionic standalone components
    IonHeader, IonToolbar, IonTitle, IonContent, IonFooter,
    IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
    IonGrid, IonRow, IonCol,
    IonList, IonItem, IonLabel, IonNote,
    IonTabs, IonTab, IonTabBar, IonTabButton,
    IonButton, IonButtons, IonIcon, IonSpinner, IonBadge,
    IonFab, IonFabButton,
    IonModal, IonAccordion, IonAccordionGroup,
    IonProgressBar, IonText,
  ],
})
export class HomePage implements AfterViewInit, OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Panel states - default tertutup, buka saat lokasi dipilih
  leftPanelCollapsed = true;
  leftPanelEnabled = true;
  rightPanelCollapsed = true;
  rightPanelEnabled = true;
  bottomPanelCollapsed = true;
  bottomPanelEnabled = true;

  // Mobile responsive states
  isMobile = false;
  bottomSheetState: BottomSheetState = 'collapsed';
  showMobileInfoModal = false;

  // Mobile location info panel states
  showMobileLocationPanel = false;
  mobileLocationPanelState: BottomSheetState = 'collapsed';
  mobileLocationInfo: MobileLocationInfoData | null = null;
  mobileLocationLoading = false;

  // Loading states for inline spinners
  initialDataLoading = true;
  locationLoading = false;
  chartDataLoading = false;
  chartDataError: string | null = null;

  // Private fields to hold the ElementRef values
  private _barCanvas: ElementRef | undefined;
  private _doughnutCanvas: ElementRef | undefined;
  private _phaseBarCanvas: ElementRef | undefined;
  private _neracaAirCanvas: ElementRef | undefined;

  @ViewChild(MapComponent) mapComponent: MapComponent | undefined;
  @ViewChild(IonTabs) ionTabs: IonTabs | undefined;

  // ViewChild Setter for Bar Chart: Triggers initialization when canvas becomes available.
  // This setter is called whenever the element is added to or removed from the DOM.
  @ViewChild('barCanvas', { static: false })
  set barCanvas(element: ElementRef | undefined) {
    this._barCanvas = element;
    if (this._barCanvas) {
      // Re-initialize chart whenever the element is added to the DOM
      if (this.qRes3 && this.qRes4) this.initBarChart(this.qRes3, this.qRes4);
    }
  }
  get barCanvas(): ElementRef | undefined {
    return this._barCanvas;
  }

  // ViewChild Setter for Doughnut Chart: Triggers initialization when canvas becomes available.
  @ViewChild('doughnutCanvas', { static: false })
  set doughnutCanvas(element: ElementRef | undefined) {
    this._doughnutCanvas = element;
    if (this._doughnutCanvas) {
      // Re-initialize chart whenever the element is added to the DOM
      this.initDoughnutChart(this.qRes3);
    }
  }
  get doughnutCanvas(): ElementRef | undefined {
    return this._doughnutCanvas;
  }

  // ViewChild Setter for Phase Bar Chart (Monitoring Tab)
  @ViewChild('phaseBarCanvas', { static: false })
  set phaseBarCanvas(element: ElementRef | undefined) {
    this._phaseBarCanvas = element;
    if (this._phaseBarCanvas && this.tab1Data) {
      this.initPhaseBarChart(this.tab1Data);
    }
  }
  get phaseBarCanvas(): ElementRef | undefined {
    return this._phaseBarCanvas;
  }

  // ViewChild Setter for Neraca Air Chart (Tab 3)
  @ViewChild('neracaAirChart', { static: false })
  set neracaAirCanvas(element: ElementRef | undefined) {
    this._neracaAirCanvas = element;
    if (this._neracaAirCanvas && this.tab3IrrigationData) {
      this.initNeracaAirChart();
    }
  }
  get neracaAirCanvas(): ElementRef | undefined {
    return this._neracaAirCanvas;
  }

  // Chart instances
  barChart: Chart | undefined;
  doughnutChart: Chart | undefined;
  phaseBarChart: Chart | undefined;
  neracaAirChart: Chart | undefined;

  // Data for Tab 3 - Irrigation data per dasarian
  tab3IrrigationData: Tab3IrrigationData | null = null;
  jadwalIrigasiData: Array<{
    jadwal: string;
    debit: number;
    durasi: number;
    pompa: number;
  }> = [];

  qRes$!: Observable<QueryResponse | QueryResponse[]>;
  qRes1!: any;
  qRes2!: any;
  qRes3!: any;
  qRes4!: any;
  queryResult: QueryResponse | null = null;
  todayDekad!: any;
  latest!: any;
  latestQ80Year!: number;

  // Location hierarchy string for display (format: "Desa, Kecamatan, Kabupaten, Provinsi - ID")
  locationHierarchy: string = '';

  // Environment for debug tools
  environment = environment;

  // Query metadata for debug buttons
  queryMetadata: {
    locationHierarchy?: QueryMetadata;
    sumberDayaLahan?: QueryMetadata;
    curahHujan?: QueryMetadata;
    tab1Siscrop?: QueryMetadata;
    tab2Katam?: QueryMetadata;
    tab3Sifortuna?: QueryMetadata;
    tab4Summary?: QueryMetadata;
  } = {};

  // SISCROP data fields
  siscropData!: SiscropData | null;
  siscropAnalysis!: any;
  siscropLoading = false;
  siscropError: string | null = null;

  // Right panel data
  tab1Data: SiscropDisplayData | null = null;
  tab2Data: KatamDisplayData | null = null;
  tab3Data: SifortunaDisplayData | null = null;
  tab4Data: {
    desa: SummaryData | null;
    kabu: SummaryData | null;
    prov: SummaryData | null;
    nasional: SummaryData | null;
    availability?: {
      desa?: DataAvailabilityInfo;
      kabu?: DataAvailabilityInfo;
      prov?: DataAvailabilityInfo;
      nasional?: DataAvailabilityInfo;
    };
  } = {
    desa: null,
    kabu: null,
    prov: null,
    nasional: null,
    availability: {}
  };

  // Cached national data (loaded on init)
  nationalDataCache: {
    siscrop: SummaryData | null;
    katam: SummaryData | null;
  } = { siscrop: null, katam: null };

  nationalDataLoaded = false;

  // Track currently selected tab
  selectedTab: string = 'katam'; // Default to KATAM tab

  // Right panel state management
  tabStates: RightPanelState = {
    tab1: { loading: false, error: null, lastUpdated: null },
    tab2: { loading: false, error: null, lastUpdated: null },
    tab3: { loading: false, error: null, lastUpdated: null },
    tab4: { loading: false, error: null, lastUpdated: null }
  };

  currentLocationLevel: string = '';

  // Label mapping for level data display
  private readonly levelLabels: { [key: string]: string } = {
    'nasional': 'Nasional',
    'prov': 'Provinsi',
    'kabu': 'Kabupaten',
    'keca': 'Kecamatan',
    'desa': 'Desa',
    'lahan': 'Lahan'
  };

  constructor(
    private sqlQueryService: SqlQueryService,
    public idWatcher: CurrentIdService,
    public helperFn: HelperFnService,
    private siscropFormulaService: SiscropFormulaService,
    public rightPanelDataService: RightPanelDataService,  // Changed to public for template access
    public screenService: ScreenService
  ) {
    addIcons({
      'information-circle-outline': informationCircleOutline,
      'close': close,
      'alert-circle': alertCircle,
      'calendar': calendar,
      'leaf': leaf,
      'water': water,
      'checkmark-circle': checkmarkCircle,
      'warning': warning,
      'bug': bug,
      'trending-down': trendingDown,
      'bar-chart': barChart,
      'location': location,
      'business': business,
      'map': mapIcon,
      'globe': globe,
      'eye': eye,
      'albums': albums,
      'construct': construct
    });
  }

  ngOnInit() {
    // Subscribe to screen size changes
    this.screenService.isMobile$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isMobile => {
        this.isMobile = isMobile;
        // Auto-collapse panels on mobile
        if (isMobile) {
          this.leftPanelCollapsed = true;
          this.rightPanelCollapsed = true;
        }
      });

    // Set Tab 2 (KATAM) as default and show loading immediately
    this.setInitialKatamTab();

    // Calculate today's dekad (synchronous, no API call)
    this.todayDekad = this.dekadForDate(new Date());

    // Load initial data in parallel (non-blocking)
    this.loadInitialData();

    // Note: preloadNationalData() disabled - panel starts collapsed, data loads on location select
  }

  /**
   * Load initial data (latestQ80Year and latest) in parallel
   * Non-blocking to allow UI to render immediately
   */
  private loadInitialData(): void {
    // Run both queries in parallel using forkJoin
    forkJoin({
      q80Year: this.sqlQueryService
        .executeQuery('select * from v2_q80lps_maxyear')
        .pipe(map((res) => res.data[0]?.tahun ?? new Date().getFullYear())),
      latest: this.sqlQueryService
        .executeQuery('select * from latest')
        .pipe(map((res) => res.data[0] ?? {}))
    }).subscribe({
      next: (results) => {
        this.latestQ80Year = results.q80Year;
        this.latest = results.latest;

        // FOR TESTING ONLY
        this.latest.MUSIM = 1; // Changed to MT1 (Musim Hujan) - more data available
        this.latest.TAHUN = 2025;
        // end of FOR TESTING ONLY

        this.initialDataLoading = false;
        console.log('[INIT] Initial data loaded:', { q80Year: this.latestQ80Year, latest: this.latest });
      },
      error: (error) => {
        console.error('[INIT] Failed to load initial data:', error);
        // Set defaults on error
        this.latestQ80Year = new Date().getFullYear();
        this.latest = { MUSIM: 1, TAHUN: 2025 };
        this.initialDataLoading = false;
      }
    });
  }

  /**
   * Set initial state for KATAM tab with loading indicator
   * Called immediately on startup before data is fetched
   */
  private setInitialKatamTab(): void {
    // Set loading state for tab2
    this.tabStates.tab2.loading = true;
    this.tabStates.tab2.error = null;
    this.currentLocationLevel = 'nasional';
    this.selectedTab = 'katam';

    // Select katam tab after DOM is ready
    setTimeout(() => {
      if (this.ionTabs) {
        this.ionTabs.select('katam');
        console.log('[INIT] KATAM tab activated with loading state');
      }
    }, 100);
  }

  /**
   * Pre-fetch national data on dashboard initialization
   * This runs once on app load to cache static national-level data
   */
  private preloadNationalData(): void {
    console.log('[INIT] Pre-loading national data...');

    // Fetch national summary data using dedicated national identifier
    // Note: Database uses ID_ADMIN = '1' for national level (not '00')
    const nationalID = '1';

    this.rightPanelDataService.fetchSummaryData(nationalID).subscribe({
      next: (nationalData) => {
        if (nationalData && nationalData.nasional) {
          this.nationalDataCache.siscrop = nationalData.nasional;
          this.nationalDataCache.katam = nationalData.nasional;
          this.nationalDataLoaded = true;
          this.setDefaultSummaryView();
          console.log('[INIT] National data pre-loaded successfully');
        } else {
          console.warn('[INIT] National data not available');
          this.tabStates.tab4.loading = false;
          this.tabStates.tab4.error = 'Data nasional tidak tersedia';
        }
      },
      error: (error) => {
        console.error('[INIT] Failed to pre-load national data:', error);
        this.tabStates.tab4.loading = false;
        this.tabStates.tab4.error = 'Gagal memuat data nasional';
      }
    });
  }

  /**
   * Set default view to show Summary tab with national data expanded
   * Called after national data is successfully loaded
   */
  private setDefaultSummaryView(): void {
    if (this.nationalDataLoaded && this.nationalDataCache.siscrop) {
      // Populate tab4Data with national data only
      this.tab4Data = {
        desa: null,
        kabu: null,
        prov: null,
        nasional: this.nationalDataCache.siscrop,
        availability: {}
      };

      // Set accordion to expand national section
      this.currentLocationLevel = 'nasional';

      // Update tab4 state - data loaded successfully
      this.tabStates.tab4.loading = false;
      this.tabStates.tab4.error = null;
      this.tabStates.tab4.lastUpdated = new Date();

      console.log('[INIT] Default view set to national summary');
      console.log('[INIT] tab4Data.nasional:', this.tab4Data.nasional);
    }
  }

  ngAfterViewInit() {
    // Subscribe to currentID changes and call onChange method
    this.qRes$ = this.idWatcher.currentId$.pipe(
      switchMap((newID) => this.onIDChange(newID))
    );
    this.qRes$.subscribe((val: any) => {
      if (!Array.isArray(val)) {
        if (val.q === 1) this.qRes1 = val.data[0];
        if (val.q === 2) this.qRes2 = val.data[0];
      } else {
        //forkJoin - chart data (rainfall)
        if (val[0].q === 3 && val[1].q === 4) {
          this.chartDataLoading = false;
          if (val[0].data[0] && val[1].data[0]) {
            this.chartDataError = null;
            this.qRes3 = val[0].data[0];
            this.qRes4 = val[1].data[0];
            this.initBarChart(this.qRes3, this.qRes4);
          } else {
            this.chartDataError = 'Data curah hujan tidak tersedia untuk lokasi ini';
            this.qRes3 = null;
            this.qRes4 = null;
          }
        }
      }
    });

    // Subscribe to location changes for right panel
    this.idWatcher.currentId$.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(locationID => {
      if (locationID && locationID.length >= 6) { // Changed from >= 10 to >= 6 to support kecamatan level
        console.log('[RIGHT PANEL] Location changed:', locationID, 'length:', locationID.length);
        this.updateCurrentLocationLevel(locationID);
        this.loadRightPanelData(locationID);
        // Buka panel saat lokasi dipilih
        this.openPanelsOnLocationSelect();

        // Trigger mobile location panel on mobile devices
        if (this.isMobile) {
          this.onMapLocationClick(locationID);
        }
      } else {
        console.log('[RIGHT PANEL] Clearing data, invalid ID:', locationID);
        this.clearRightPanelData();
        // Close mobile location panel if open
        if (this.showMobileLocationPanel) {
          this.closeMobileLocationPanel();
        }
      }
    });
  }

  // --- Event Handlers ---
  // update content if new selected location ID
  onIDChange(locationID: string): Observable<any> {
    if (locationID === '') {
      this.locationHierarchy = '';
      this.chartDataLoading = false;
      this.chartDataError = null;
      return EMPTY;
    }
    // Set chart loading state
    this.chartDataLoading = true;
    this.chartDataError = null;
    const idLength = locationID.length;
    let sufix = '';
    switch (idLength) {
      case 2: //prov
        sufix = 'PROV';
        break;
      case 4: //kabu
        sufix = 'KABU';
        break;
      case 6: //keca
        sufix = 'KECA';
        break;
      case 10: //desa
        sufix = 'DESA';
        break;
      default: //lahan: 13
        sufix = 'LAHAN';
        break;
    }

    // Build location hierarchy string for display
    this.buildLocationHierarchy(locationID);
    const sqlQuery1 =
      `select * from v2_katam_summary` +
      (idLength > 10 ? `` : `_` + sufix.toLocaleLowerCase()) +
      ` where ID_` +
      sufix +
      ` = '` +
      locationID +
      `' and TAHUN = '` +
      this.latest.TAHUN +
      `' and SEA = '` +
      this.latest.MUSIM +
      `'`;

    const sqlQuery2 =
      `select * from v2_sdia_` +
      sufix.toLocaleLowerCase() +
      ` where ID_` +
      sufix +
      ` = '` +
      locationID +
      `' and TAHUN = '` +
      this.latestQ80Year +
      `'`;

    // Determine rainfall prediction tables based on location level
    let predTable = 't2_pre_pred';
    let normTable = 't2_pre_norm';
    let predIdColumn = 'ID_DESA';
    let predQueryID = locationID.substring(0, 10);

    const locIdLength = locationID.length;
    if (locIdLength === 2) {
      predTable = 't2_pre_pred_prov';
      normTable = 't2_pre_norm_prov';
      predIdColumn = 'ID_PROV';
      predQueryID = locationID;
    } else if (locIdLength === 4) {
      predTable = 't2_pre_pred_kabu';
      normTable = 't2_pre_norm_kabu';
      predIdColumn = 'ID_KABU';
      predQueryID = locationID;
    } else if (locIdLength === 6) {
      predTable = 't2_pre_pred_keca';
      normTable = 't2_pre_norm_keca';
      predIdColumn = 'ID_KECA';
      predQueryID = locationID;
    } else if (locIdLength >= 10 && locIdLength < 13) {
      predTable = 't2_pre_pred';
      normTable = 't2_pre_norm';
      predIdColumn = 'ID_DESA';
      predQueryID = locationID.substring(0, 10);
    } else if (locIdLength >= 13) {
      predTable = 't2_pre_pred_lahan';
      normTable = 't2_pre_norm_lahan';
      predIdColumn = 'ID_LAHAN';
      predQueryID = locationID;
    }

    const sqlQuery3 =
      `SELECT * FROM ${predTable} WHERE ${predIdColumn} = '${predQueryID}' AND TAHUN = '${this.todayDekad.year}'`;

    const sqlQuery4 =
      `SELECT * FROM ${normTable} WHERE ${predIdColumn} = '${predQueryID}'`;

    // Store metadata for debug buttons
    this.queryMetadata.sumberDayaLahan = {
      query: sqlQuery2,
      database: 'siaptanam',
      table: `v2_sdia_${sufix.toLowerCase()}`,
      description: 'Sumber Daya Lahan Query'
    };

    this.queryMetadata.curahHujan = {
      query: `Query 3 (Prediction):\n${sqlQuery3}\n\nQuery 4 (Normal):\n${sqlQuery4}`,
      database: 'siaptanam',
      table: `${predTable}, ${normTable}`,
      description: 'Curah Hujan Prediction & Normal'
    };

    return merge(
      this.runQuery(sqlQuery1).pipe(map((res) => ({ ...res, q: 1 }))),
      this.runQuery(sqlQuery2).pipe(map((res) => ({ ...res, q: 2 }))),
      forkJoin([
        this.runQuery(sqlQuery3).pipe(map((res) => ({ ...res, q: 3 }))),
        this.runQuery(sqlQuery4).pipe(map((res) => ({ ...res, q: 4 }))),
      ]).pipe(
        map(([res3, res4]) => [res3, res4] as [QueryResponse, QueryResponse])
      )
    );
  }

  runQuery(sql: string): Observable<any> {
    return this.sqlQueryService.executeQuery(sql);
  }

  /**
   * Build location hierarchy string from ID
   * Format: "Desa, Kecamatan, Kabupaten, Provinsi - ID"
   * @param locationID - The location ID (can be 2, 4, 6, 10, or 13 digits)
   */
  private buildLocationHierarchy(locationID: string): void {
    if (!locationID || locationID === '') {
      this.locationHierarchy = '';
      this.locationLoading = false;
      return;
    }

    this.locationLoading = true;
    const idLength = locationID.length;
    const ids: string[] = [];

    // Parse ID to extract each hierarchical level
    if (idLength >= 2) {
      ids.push(locationID.substring(0, 2));  // Provinsi
    }
    if (idLength >= 4) {
      ids.push(locationID.substring(0, 4));  // Kabupaten
    }
    if (idLength >= 6) {
      ids.push(locationID.substring(0, 6));  // Kecamatan
    }
    if (idLength >= 10) {
      ids.push(locationID.substring(0, 10)); // Desa
    }

    // Build SQL query to fetch all names at once
    const sqlQuery =
      'SELECT `ID_ADMIN`, `NAMA` FROM `t2_admin` ' +
      'WHERE `ID_ADMIN` IN (' + ids.map(id => `'${id}'`).join(',') + ') ' +
      'ORDER BY LENGTH(`ID_ADMIN`) DESC';

    // Store metadata for debug button
    this.queryMetadata.locationHierarchy = {
      query: sqlQuery,
      database: 'siaptanam',
      table: 't2_admin',
      description: 'Location Hierarchy Query'
    };

    this.sqlQueryService.executeQuery(sqlQuery).subscribe({
      next: (response: QueryResponse) => {
        if (response.status === 'success' && response.data.length > 0) {
          // Database NAMA column already contains full hierarchy (e.g., "Desa, Kec, Kab, Prov")
          // Just use the first result (longest ID = most specific level) which has complete hierarchy
          const mostSpecificName = response.data[0].NAMA;
          this.locationHierarchy = mostSpecificName + ' - ' + locationID;
        } else {
          this.locationHierarchy = locationID;
        }
        this.locationLoading = false;
      },
      error: () => {
        this.locationHierarchy = locationID;
        this.locationLoading = false;
      }
    });
  }

  /**
   * Load SISCROP data from scs1 database using correct table names
   * Table names: q_sc_kabupaten, q_sc_propinsi, q_sc_kecamatan, q_sc_desa, q_sc_nasional
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

      // Determine correct table name and ID column based on location level
      // IMPORTANT: Using full table names from scs1.sql database dump
      switch (idLength) {
        case 2:  // Province
          tableName = 'q_sc_propinsi';  // NOT q_sc_prov
          idColumn = 'id_bps';
          break;
        case 4:  // District/Kabupaten
          tableName = 'q_sc_kabupaten';  // NOT q_sc_kabu
          idColumn = 'id_bps';
          break;
        case 6:  // Sub-district/Kecamatan
          tableName = 'q_sc_kecamatan';  // NOT q_sc_keca
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

      // Construct SQL query for SISCROP data
      // Get latest data for the location
      const sqlQuery =
        `SELECT id_bps, x0, x1, x2, x3, x4, x5, x6, x7, data_date, lbs, ` +
        `provitas_bps, provitas_sc FROM ${tableName} ` +
        `WHERE ${idColumn} = '${locationID}' ` +
        `ORDER BY data_date DESC LIMIT 1`;

      console.log('[SISCROP Query]', sqlQuery);

      // Execute query on scs1 database
      const response = await firstValueFrom(
        this.sqlQueryService.executeScs1Query(sqlQuery)
      );

      if (response.status === 'success' && response.data && response.data.length > 0) {
        this.siscropData = response.data[0] as SiscropData;

        // Analyze SISCROP data using formula service
        this.siscropAnalysis = this.siscropFormulaService.analyzeSiscropData(this.siscropData);

        console.log('[SISCROP Data]', this.siscropData);
        console.log('[SISCROP Analysis]', this.siscropAnalysis);

        this.siscropError = null;
      } else {
        this.siscropError = 'No SISCROP data found for this location';
        this.siscropData = null;
        this.siscropAnalysis = null;
      }
    } catch (error: any) {
      console.error('[SISCROP Error]', error);
      this.siscropError = error.message || 'Failed to load SISCROP data';
      this.siscropData = null;
      this.siscropAnalysis = null;
    } finally {
      this.siscropLoading = false;
    }
  }

  // --- Chart Initialization Methods (Called by Setters) ---

  initBarChart(jsonPred: any, jsonNorm: any) {
    if (this.barChart) {
      this.barChart.destroy();
      this.barChart = undefined;
    }
    const predData = this.filterDekads(
      jsonPred,
      this.todayDekad.globalDekad,
      9
    );
    const normData = this.filterDekads(
      jsonNorm,
      this.todayDekad.globalDekad,
      9
    );

    if (this.barCanvas?.nativeElement) {
      this.barChart = new Chart(this.barCanvas.nativeElement, {
        type: 'bar',
        data: {
          labels: Object.keys(predData),
          datasets: [
            {
              type: 'line',
              label: 'Normal',
              data: Object.values(normData),
              backgroundColor: 'darkblue',
              borderWidth: 1,
            },
            {
              label: 'Prediksi',
              data: Object.values(predData),
              backgroundColor: 'lightblue',
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              title: {
                display: true,
                text: 'Dasarian',
              },
            },
            y: {
              title: {
                display: true,
                text: 'CH, mm',
              },
              reverse: true,
              ticks: {
                autoSkip: false,
                maxRotation: 0,
              },
            },
          },
        },
      });
      // The chart is visible now, so resize it immediately
      this.barChart.resize();
    }
  }

  initDoughnutChart(chartData: any) {
    if (this.doughnutChart) {
      // CRITICAL FIX: Destroy the old chart instance if it exists
      this.doughnutChart.destroy();
      this.doughnutChart = undefined;
    }

    if (this.doughnutCanvas?.nativeElement) {
      this.doughnutChart = new Chart(this.doughnutCanvas.nativeElement, {
        type: 'doughnut',
        data: {
          labels: ['Wheat', 'Corn', 'Soy', 'Other'],
          datasets: [
            {
              label: 'Crop Distribution',
              data: [300, 50, 100, 20],
              backgroundColor: [
                '#36a2eb', // Blue
                '#ff6384', // Red
                '#ffce56', // Yellow
                '#4bc0c0', // Teal
              ],
              hoverOffset: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
            },
            title: {
              display: true,
              text: 'Current Crop Split',
            },
          },
        },
      });
      // The chart is visible now, so resize it immediately
      this.doughnutChart.resize();
    }
  }

  /**
   * Initialize Phase Bar Chart for SISCROP Monitoring
   * Shows distribution of rice growth phases (x1-x6)
   */
  initPhaseBarChart(data: SiscropDisplayData) {
    if (this.phaseBarChart) {
      this.phaseBarChart.destroy();
      this.phaseBarChart = undefined;
    }

    if (this.phaseBarCanvas?.nativeElement) {
      const phases = data.phaseAreas;

      this.phaseBarChart = new Chart(this.phaseBarCanvas.nativeElement, {
        type: 'bar',
        data: {
          labels: ['Air', 'Vegetatif I', 'Vegetatif II', 'Generatif I', 'Generatif II', 'Bera'],
          datasets: [
            {
              label: 'Luas (ha)',
              data: [
                phases['air'],
                phases['vegetatif1'],
                phases['vegetatif2'],
                phases['generatif1'],
                phases['generatif2'],
                phases['bera']
              ],
              backgroundColor: [
                'rgba(0,0,200,0.9)',   // Air (x1) - Biru
                'rgba(0,250,0,0.9)',   // Vegetatif I (x2) - Hijau terang
                'rgba(34,139,34,0.9)', // Vegetatif II (x3) - Hijau tua
                'rgba(255,255,200,0.9)', // Generatif I (x4) - Kuning muda
                'rgba(255,255,0,0.9)', // Generatif II (x5) - Kuning
                'rgba(158,54,35,0.9)', // Bera (x6) - Coklat/Merah tua
              ],
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              title: {
                display: true,
                text: 'Fase Pertumbuhan',
              },
            },
            y: {
              title: {
                display: true,
                text: 'Luas (ha)',
              },
              beginAtZero: true,
              ticks: {
                callback: function(value) {
                  // Format angka: jika < 0.01 tampilkan sebagai 0, jika tidak format dengan 2 desimal
                  const numValue = typeof value === 'number' ? value : parseFloat(value as string);
                  if (numValue < 0.01) return '0';
                  return numValue.toFixed(2);
                }
              }
            },
          },
          plugins: {
            legend: {
              display: false,
            },
            title: {
              display: true,
              text: 'Distribusi Fase Padi (x1-x6)',
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const value = context.parsed.y;
                  // Format tooltip: jika null atau < 0.01 tampilkan 0, jika tidak format dengan 2 desimal
                  if (!value || value < 0.01) {
                    return 'Luas: 0 ha';
                  }
                  return 'Luas: ' + value.toFixed(2) + ' ha';
                }
              }
            }
          },
        },
      });
      this.phaseBarChart.resize();
    }
  }

  /**
   * Initialize Neraca Air Chart (Tab 3 - Combination Bar + Line Chart)
   * Shows WRQ (kebutuhan), IRR (defisit), and WTOT (ketersediaan) per Dasarian
   * Data comes from t2_katam_* tables (per-dasarian) or fallback to v2_katam_* (per-MT)
   */
  initNeracaAirChart() {
    if (this.neracaAirChart) {
      this.neracaAirChart.destroy();
      this.neracaAirChart = undefined;
    }

    if (!this._neracaAirCanvas || !this.tab3IrrigationData) return;

    // Get data from tab3IrrigationData (per-dasarian from service)
    const { labels, wrq, wtot, irr } = this.tab3IrrigationData.chartData;

    // If no data, skip chart creation
    if (labels.length === 0) {
      console.log('[NeracaAirChart] No data to display');
      return;
    }

    // IRR as negative values (bar goes down)
    const irrNegative = irr.map(v => -v);

    this.neracaAirChart = new Chart(this._neracaAirCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Kebutuhan (WRQ)',
            data: wrq,
            backgroundColor: 'rgba(76, 175, 80, 0.8)',
            borderColor: 'rgba(76, 175, 80, 1)',
            borderWidth: 1,
            stack: 'stack1',
            yAxisID: 'y',
            order: 2,
          },
          {
            label: 'Defisit (IRR)',
            data: irrNegative,
            backgroundColor: 'rgba(156, 39, 176, 0.8)',
            borderColor: 'rgba(156, 39, 176, 1)',
            borderWidth: 1,
            stack: 'stack1',
            yAxisID: 'y',
            order: 3,
          },
          {
            label: 'Ketersediaan (WTOT)',
            data: wtot,
            type: 'line',
            borderColor: 'rgba(33, 150, 243, 1)',
            backgroundColor: 'rgba(33, 150, 243, 0.1)',
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            pointRadius: 4,
            yAxisID: 'y1',
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            title: {
              display: true,
              text: 'Dasarian',
            },
            stacked: true,
            grid: {
              display: false,
            },
          },
          y: {
            type: 'linear',
            position: 'left',
            title: {
              display: true,
              text: 'Kebutuhan & Defisit (mm)',
            },
            stacked: true,
            beginAtZero: true,
          },
          y1: {
            type: 'linear',
            position: 'right',
            title: {
              display: true,
              text: 'Ketersediaan Air (mm)',
            },
            grid: {
              drawOnChartArea: false,
            },
            beginAtZero: true,
          },
        },
        plugins: {
          legend: {
            display: false, // We have custom legend in HTML
          },
          tooltip: {
            callbacks: {
              label: function(context: any) {
                const value = Math.abs(context.raw);
                return `${context.dataset.label}: ${value.toFixed(1)} mm`;
              }
            }
          }
        },
      },
    });
    this.neracaAirChart.resize();
  }

  /**
   * Handler for the ion-resize event on the main content.
   * This calls invalidateSize() on the map and updates the charts.
   */
  onResize() {
    this.mapComponent?.forceMapUpdate();

    // Manually resize charts on container resize
    this.barChart?.resize();
    this.doughnutChart?.resize();
    this.phaseBarChart?.resize();
    this.neracaAirChart?.resize();
  }

  isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }

  daysInMonth(year: number, monthIndex: number): number {
    return [
      31,
      this.isLeapYear(year) ? 29 : 28,
      31,
      30,
      31,
      30,
      31,
      31,
      30,
      31,
      30,
      31,
    ][monthIndex];
  }

  dekadForDate(date: Date) {
    const y = date.getFullYear();
    const m = date.getMonth(); // 0 = Jan
    const d = date.getDate();
    const dim = this.daysInMonth(y, m);

    // Determine dekad within the month
    let dekadInMonth;
    if (d <= 10) dekadInMonth = 1;
    else if (d <= 20) dekadInMonth = 2;
    else dekadInMonth = 3;

    // Global dekad number (1–36)
    const globalDekad = m * 3 + dekadInMonth;

    // Start and end dates of the dekad
    const startDay = dekadInMonth === 1 ? 1 : dekadInMonth === 2 ? 11 : 21;
    const endDay = dekadInMonth === 1 ? 10 : dekadInMonth === 2 ? 20 : dim;

    return {
      year: y,
      monthIndex: m, // 0 = Jan
      dekadInMonth, // 1–3
      globalDekad, // 1–36
      rangeStart: new Date(y, m, startDay),
      rangeEnd: new Date(y, m, endDay),
    };
  }

  filterDekads(data: any, start: number, length: number = 9): any {
    const total = 36; // number of d-variables

    const result: any = {};

    for (let i = 0; i < length; i++) {
      // wrap around using modulo
      const index = ((start - 1 + i) % total) + 1;

      // format as d01, d02, … d36
      const key = `d${index.toString().padStart(2, '0')}`;

      result[key] = data[key];
    }

    return result;
  }

  // ============================================================================
  // RIGHT PANEL DATA LOADING
  // ============================================================================

  /**
   * Load all right panel data when location changes
   */
  private loadRightPanelData(locationID: string): void {
    this.loadTab1Data(locationID);
    this.loadTab2Data(locationID);
    this.loadTab3Data(locationID);
    this.loadTab4Data(locationID);
  }

  /**
   * Load Tab 1: SISCROP Monitoring
   */
  private loadTab1Data(locationID: string): void {
    this.tabStates.tab1.loading = true;
    this.tabStates.tab1.error = null;

    // Store metadata for debug button
    const idLength = locationID.length;
    let tableName = 'q_sc_nasional';
    if (idLength === 2) tableName = 'q_sc_propinsi';
    else if (idLength === 4) tableName = 'q_sc_kabupaten';
    else if (idLength === 6) tableName = 'q_sc_kecamatan';
    else if (idLength === 10) tableName = 'q_sc_desa';

    this.queryMetadata.tab1Siscrop = {
      query: `SELECT id_bps, x0, x1, x2, x3, x4, x5, x6, x7, data_date, lbs, provitas_bps, provitas_sc FROM ${tableName} WHERE id_bps = '${locationID}' ORDER BY data_date DESC LIMIT 1`,
      database: 'scs1',
      table: tableName,
      description: 'SISCROP Monitoring Query'
    };

    this.rightPanelDataService.fetchSiscropMonitoring(locationID).subscribe({
      next: (data) => {
        this.tab1Data = data;
        this.tabStates.tab1.loading = false;
        this.tabStates.tab1.lastUpdated = new Date();
        if (!data) {
          this.tabStates.tab1.error = 'Data SISCROP tidak tersedia untuk lokasi ini';
        } else {
          // Initialize phase bar chart if canvas is available
          if (this.phaseBarCanvas) {
            this.initPhaseBarChart(data);
          }
        }
      },
      error: () => {
        this.tabStates.tab1.loading = false;
        this.tabStates.tab1.error = 'Gagal memuat data SISCROP';
        this.tab1Data = null;
      }
    });
  }

  /**
   * Load Tab 2: KATAM Planning
   */
  private loadTab2Data(locationID: string): void {
    this.tabStates.tab2.loading = true;
    this.tabStates.tab2.error = null;

    const tahun = this.latest?.TAHUN?.toString() || '2025';
    const musim = this.latest?.MUSIM?.toString() || '1'; // Changed default to MT1

    console.log('[TAB2] Loading KATAM data for:', { locationID, tahun, musim });

    // Store metadata for debug button
    const idLength = locationID.length;
    let tableName = 'v2_katam_summary'; // default untuk desa/lahan
    let idColumnSuffix = 'DESA';

    if (idLength === 2) {
      tableName = 'v2_katam_prov';
      idColumnSuffix = 'PROV';
    } else if (idLength === 4) {
      tableName = 'v2_katam_kabu';
      idColumnSuffix = 'KABU';
    } else if (idLength === 6) {
      tableName = 'v2_katam_summary_keca';
      idColumnSuffix = 'KECA';
    } else if (idLength >= 10) {
      tableName = 'v2_katam_summary';
      idColumnSuffix = 'DESA';
    }

    this.queryMetadata.tab2Katam = {
      query: `SELECT * FROM ${tableName} WHERE ID_${idColumnSuffix} = '${locationID}' AND TAHUN = '${tahun}' AND SEA = '${musim}'`,
      database: 'siaptanam',
      table: tableName,
      description: 'KATAM Planning Query'
    };

    this.rightPanelDataService.fetchKatamPlanning(locationID, tahun, musim).subscribe({
      next: (result) => {
        console.log('[TAB2] KATAM result received:', result);
        this.tab2Data = result.data;
        this.tabStates.tab2.availabilityInfo = result.availability;
        this.tabStates.tab2.loading = false;
        this.tabStates.tab2.lastUpdated = new Date();

        if (!result.availability.available) {
          console.warn('[TAB2] KATAM data not available:', result.availability.message);
          this.tabStates.tab2.error = result.availability.message;
        }
      },
      error: (err) => {
        console.error('[TAB2] KATAM fetch error:', err);
        this.tabStates.tab2.loading = false;
        this.tabStates.tab2.error = 'Gagal memuat data KATAM';
        this.tabStates.tab2.availabilityInfo = {
          available: false,
          reason: 'network_error',
          message: 'Gagal memuat data KATAM',
          details: 'Terjadi kesalahan jaringan.'
        };
        this.tab2Data = null;
      }
    });
  }

  /**
   * Load Tab 3: Irrigation Optimization (Per-Dasarian data from t2_katam_*)
   */
  private loadTab3Data(locationID: string): void {
    this.tabStates.tab3.loading = true;
    this.tabStates.tab3.error = null;

    const tahun = this.latest?.TAHUN?.toString() || '2025';
    const musim = this.latest?.SEA?.toString() || '1';

    // Determine table based on location level
    const idLength = locationID.length;
    let tableName = 't2_katam_keca';
    if (idLength === 10) tableName = 't2_katam_desa';
    else if (idLength > 10) tableName = 't2_katam';
    else if (idLength < 6) tableName = 'v2_katam_* (fallback)';

    // Store metadata for debug button
    this.queryMetadata.tab3Sifortuna = {
      query: `SELECT DSR, DST, WTOT, WRQ, IRR, WDQ, MT, CROP FROM ${tableName} WHERE ID = '${locationID}' AND TAHUN = '${tahun}' AND SEA = '${musim}' ORDER BY MT, DSR`,
      database: 'siaptanam',
      table: tableName,
      description: 'Irrigation Data Per-Dasarian Query'
    };

    this.rightPanelDataService.fetchTab3IrrigationData(locationID, tahun, musim).subscribe({
      next: (data) => {
        this.tab3IrrigationData = data;
        this.tabStates.tab3.loading = false;
        this.tabStates.tab3.lastUpdated = new Date();

        if (data) {
          // Set table data directly from service
          this.jadwalIrigasiData = data.tableData;
          // Initialize chart
          this.initNeracaAirChart();
        } else {
          this.tabStates.tab3.error = 'Data irigasi tidak tersedia untuk lokasi ini';
          this.jadwalIrigasiData = [];
        }
      },
      error: () => {
        this.tabStates.tab3.loading = false;
        this.tabStates.tab3.error = 'Gagal memuat data irigasi';
        this.tab3IrrigationData = null;
        this.jadwalIrigasiData = [];
      }
    });
  }

  /**
   * Load Tab 4: Summary Data
   */
  private loadTab4Data(locationID: string): void {
    this.tabStates.tab4.loading = true;
    this.tabStates.tab4.error = null;

    // Store metadata for debug button
    const idLength = locationID.length;
    let level = 'nasional';
    if (idLength === 2) level = 'provinsi';
    else if (idLength === 4) level = 'kabupaten';
    else if (idLength === 6) level = 'kecamatan';
    else if (idLength === 10) level = 'desa';

    this.queryMetadata.tab4Summary = {
      query: `Aggregate queries for location ${locationID} (${level}) and parent levels. Includes SISCROP and KATAM summary data from v2_katam_summary_* tables.`,
      database: 'siaptanam + scs1',
      table: 'v2_katam_summary_prov, _kabu, _keca, _desa + q_sc_*',
      description: 'Summary Aggregate Queries'
    };

    // Pass tahun and musim to sync with Tab 2 (Perencanaan)
    const tahun = this.latest?.TAHUN?.toString() || '2025';
    const musim = this.latest?.SEA?.toString() || '1';

    this.rightPanelDataService.fetchSummaryData(locationID, tahun, musim).subscribe({
      next: (data) => {
        // Filter out levels below current selection based on hierarchy
        const filteredData = {
          desa: this.shouldShowSummaryLevel('desa') ? data.desa : null,
          kabu: this.shouldShowSummaryLevel('kabu') ? data.kabu : null,
          prov: this.shouldShowSummaryLevel('prov') ? data.prov : null,
          nasional: data.nasional, // Always include national
          availability: data.availability
        };

        this.tab4Data = filteredData;
        this.tabStates.tab4.loading = false;
        this.tabStates.tab4.lastUpdated = new Date();

        // Check if any visible level has data
        const hasVisibleData = filteredData.desa || filteredData.kabu || filteredData.prov || filteredData.nasional;
        if (!hasVisibleData) {
          this.tabStates.tab4.error = 'Data summary tidak tersedia';
        }
      },
      error: () => {
        this.tabStates.tab4.loading = false;
        this.tabStates.tab4.error = 'Gagal memuat data summary';
        this.tab4Data = {
          desa: null,
          kabu: null,
          prov: null,
          nasional: null,
          availability: {}
        };
      }
    });
  }

  // ============================================================================
  // HELPER METHODS FOR TEMPLATE
  // ============================================================================

  /**
   * Get phase keys for iteration in template
   */
  getPhaseKeys(): string[] {
    return ['bera', 'tanam', 'vegetatif1', 'vegetatif2',
            'generatif', 'masak', 'panen', 'air'];
  }

  /**
   * Get Indonesian name for phase
   */
  getPhaseName(key: string): string {
    const names: any = {
      bera: 'Bera',
      tanam: 'Tanam',
      vegetatif1: 'Vegetatif 1',
      vegetatif2: 'Vegetatif 2',
      generatif: 'Generatif',
      masak: 'Masak',
      panen: 'Panen',
      air: 'Air'
    };
    return names[key] || key;
  }

  /**
   * Get Ionic color for phase
   */
  getPhaseColor(key: string): string {
    const colors: any = {
      bera: 'danger',
      tanam: 'warning',
      vegetatif1: 'success',
      vegetatif2: 'success',
      generatif: 'tertiary',
      masak: 'secondary',
      panen: 'primary',
      air: 'medium'
    };
    return colors[key] || 'light';
  }

  /**
   * Update current location level name
   */
  private updateCurrentLocationLevel(locationID: string): void {
    const idLength = locationID.length;
    if (idLength === 2) {
      this.currentLocationLevel = 'prov';
    } else if (idLength === 4) {
      this.currentLocationLevel = 'kabu';
    } else if (idLength === 6) {
      this.currentLocationLevel = 'keca';
    } else if (idLength === 10) {
      this.currentLocationLevel = 'desa';
    } else {
      this.currentLocationLevel = 'desa'; // Lahan uses desa data
    }
  }

  /**
   * Get display label for current location level
   * Used to show "Level Data: Desa" etc in panels
   */
  getLevelLabel(): string {
    return this.levelLabels[this.currentLocationLevel] || 'Desa';
  }

  /**
   * Check if current selection is lahan level (ID > 10 chars)
   * When lahan is selected, SISCROP shows desa data
   */
  isLahanSelected(): boolean {
    const currentID = this.idWatcher.getCurrentId();
    return !!(currentID && currentID.length > 10);
  }

  /**
   * Check if a summary level should be visible based on current selection
   * @param level - The level to check (desa, kabu, prov, nasional)
   * @returns true if the level should be shown
   */
  shouldShowSummaryLevel(level: 'desa' | 'kabu' | 'prov' | 'nasional'): boolean {
    if (!this.idWatcher.getCurrentId()) {
      // No location selected - show only national for default view
      return level === 'nasional';
    }

    const currentID = this.idWatcher.getCurrentId();
    const currentLevel = this.getCurrentLevel(currentID);

    return this.rightPanelDataService.shouldShowLevel(currentLevel as LocationLevel, level as LocationLevel);
  }

  /**
   * Get current location level from ID
   */
  private getCurrentLevel(locationID: string): string {
    const idLength = locationID.length;
    if (idLength === 2) return 'prov';
    if (idLength === 4) return 'kabu';
    if (idLength === 6) return 'keca';
    if (idLength === 10) return 'desa';
    return 'lahan';
  }

  /**
   * Clear all right panel data
   */
  private clearRightPanelData(): void {
    this.tab1Data = null;
    this.tab2Data = null;
    this.tab3Data = null;
    this.tab4Data = { desa: null, kabu: null, prov: null, nasional: null };

    // Reset states
    this.tabStates = {
      tab1: { loading: false, error: null, lastUpdated: null },
      tab2: { loading: false, error: null, lastUpdated: null },
      tab3: { loading: false, error: null, lastUpdated: null },
      tab4: { loading: false, error: null, lastUpdated: null }
    };
  }

  /**
   * Open both panels when a location is selected
   * Called when user clicks map or selects from search
   */
  private openPanelsOnLocationSelect(): void {
    if (!this.isMobile) {
      this.leftPanelCollapsed = false;
      this.rightPanelCollapsed = false;
    } else {
      // Di mobile, buka bottom sheet ke half state
      this.bottomSheetState = 'half';
    }
  }

  /**
   * Format number with specified decimal places (wrapper for helperFn)
   */
  formatNumber(value: number | null | undefined, decimals: number = 0): string {
    if (value === null || value === undefined) {
      return '0';
    }
    const formatString = `1.0-${decimals}`;
    return this.helperFn.formatNUMBER(value, 'id', formatString);
  }

  /**
   * Calculate Alsintan requirement
   * Formula: ceil(totalArea * multiplier / 100)
   */
  calculateAlsintan(multiplier: number): number {
    if (!this.tab2Data?.crops?.totalArea) return 0;
    return Math.ceil(this.tab2Data.crops.totalArea * multiplier / 100);
  }

  /**
   * Get month name (Indonesian) for forecast months
   * Based on data date + offset months
   */
  getMonthName(monthOffset: number): string {
    if (!this.tab1Data || !this.tab1Data.dataDate) {
      return `Bulan ${monthOffset}`;
    }

    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    // Get base month from data date (0-indexed)
    const baseMonth = this.tab1Data.dataDate.month - 1;

    // Calculate target month (add offset, handle year wrap)
    const targetMonth = (baseMonth + monthOffset) % 12;

    return monthNames[targetMonth];
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Mobile specific methods
  toggleMobileInfoModal(): void {
    this.showMobileInfoModal = !this.showMobileInfoModal;
  }

  onBottomSheetStateChange(state: BottomSheetState): void {
    this.bottomSheetState = state;
  }

  // ============================================================================
  // MOBILE LOCATION INFO PANEL
  // ============================================================================

  /**
   * Handle map location click for mobile - shows location info panel
   * Called when a map feature is clicked on mobile
   * Logic:
   * - Lahan (ID >= 13): Full detail
   * - Desa (ID >= 10, < 13): Summary only
   * - Kecamatan (ID >= 6, < 10): Summary only
   * - Prov/Kabu (< 6): Don't show mobile panel
   */
  onMapLocationClick(locationId: string): void {
    if (!this.isMobile) return;

    const idLength = locationId.length;

    // Only show for keca, desa, lahan levels
    if (idLength < 6) {
      return;
    }

    this.mobileLocationLoading = true;
    this.showMobileLocationPanel = true;
    this.mobileLocationPanelState = 'half';

    const tahun = this.latest?.TAHUN?.toString() || '2025';
    const musim = this.latest?.MUSIM?.toString() || '1';

    this.rightPanelDataService.fetchMobileLocationInfo(locationId, tahun, musim).subscribe({
      next: (data) => {
        this.mobileLocationInfo = data;
        this.mobileLocationLoading = false;
      },
      error: (err) => {
        console.error('[MobileLocationPanel] Error:', err);
        this.mobileLocationLoading = false;
        this.mobileLocationInfo = null;
      }
    });
  }

  /**
   * Close mobile location panel
   */
  closeMobileLocationPanel(): void {
    this.showMobileLocationPanel = false;
    this.mobileLocationPanelState = 'collapsed';
    this.mobileLocationInfo = null;
  }

  /**
   * Handler for mobile location panel state change
   */
  onMobileLocationPanelStateChange(state: BottomSheetState): void {
    this.mobileLocationPanelState = state;
    if (state === 'collapsed') {
      // Close panel when collapsed
      this.closeMobileLocationPanel();
    }
  }
}
