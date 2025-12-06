// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  showDebugTools: true,  // Show debug buttons in development
  apiUrls: {
    // Use full URLs for mobile testing (proxy doesn't work with external IP access)
    siaptanam: 'https://siaptanam.brmpkementan.id/api.php',
    scs1: 'https://scs1.brmpkementan.id/api.php',
    sifortuna: 'https://sifortuna.brmpkementan.id/api.php'
  }
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
