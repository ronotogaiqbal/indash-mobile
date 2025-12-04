import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { registerLocaleData } from '@angular/common';
import localeId from '@angular/common/locales/id';
import { formatNumber } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class HelperFnService {
  constructor(private http: HttpClient) {
    registerLocaleData(localeId);
  }

  formatNUMBER(n: any, loc = 'id', f = '1.0-2') {
    return formatNumber(Number(n), loc, f);
  }

  replacePOLA(pola: string) {
    return pola
      .replace(/0/g, 'Bera')
      .replace(/1/g, 'Padi')
      .replace(/2/g, 'Jagung')
      .replace(/3/g, 'Kedelai')
      .replace(/4/g, 'Tergenang');
  }

  replaceAGROS(agros: string) {
    return agros
      .replace('00', 'Non Irigasi')
      .replace('01', 'Tadah Hujan')
      .replace('10', 'Irigasi Teknis')
      .replace('11', 'Irigasi')
      .replace('12', 'Irigasi Non Teknis')
      .replace('20', 'Pasang Surut')
      .replace('21', 'Lebak');
  }

  replaceAGROS2(agros: string) {
    let res = '';
    if (agros !== undefined) {
      let listAgros = agros.split(', ');
      if (listAgros.length > 1) {
        let ag = '';
        for (let i = 0; i < listAgros.length; i++) {
          //ag = listAgros[i].substring(0,1).replace('0','Tadah Hujan').replace('1','Irigasi').replace('2','Rawa');
          ag = this.replaceAGROS(listAgros[i]);
          if (res !== '') {
            res = res.concat(', ');
          }
          res = res.concat(ag);
        }
      } else {
        //res = (agros.substring(0,1).replace('0','Tadah Hujan').replace('1','Irigasi').replace('2','Rawa'));
        res = this.replaceAGROS(agros);
      }
    }
    return res;
  }

  replaceSAWAH(sawah: string) {
    let res = '';
    let swh = '';
    if (sawah !== undefined) {
      let listSawah = sawah.split(', ');
      if (listSawah.length > 1) {
        let ag = '';
        for (let i = 0; i < listSawah.length; i++) {
          ag = listSawah[i]
            .substring(0, 1)
            .replace('0', 'Tadah Hujan')
            .replace('1', 'Irigasi')
            .replace('2', 'Rawa');
          if (res !== '') {
            res = res.concat(', ');
          }
          if (swh !== ag) {
            res = res.concat(ag);
            swh = ag;
          }
        }
      } else {
        res = sawah
          .substring(0, 1)
          .replace('0', 'Tadah Hujan')
          .replace('1', 'Irigasi')
          .replace('2', 'Rawa');
      }
    }
    return res;
  }

  replaceSEASON(season: any) {
    if (season === undefined) {
      season = '';
    }
    return season
      .toString()
      .replace('1', 'Musim Hujan-OKMAR')
      .replace('2', 'Musim Kemarau-ASEP');
  }

  replaceAirPermukaan(i: string) {
    if (i === undefined) {
      i = '';
    }
    return i
      .toString()
      .replace('00', 'Tidak Ada')
      .replace('01', 'Dam Parit')
      .replace('02', 'Sungai');
  }

  replaceAirTanah(i: string) {
    if (i === undefined) {
      i = '';
    }
    return i
      .toString()
      .replace('00', 'Tidak Ada')
      .replace('01', 'Sumur Dangkal')
      .replace('02', 'Sumur Dalam');
  }

  replaceEmbung(i: string) {
    if (i === undefined) {
      i = '';
    }
    return i
      .toString()
      .replace('00', 'Tidak Ada')
      .replace('01', 'Long Storage')
      .replace('02', 'Embung');
  }

  formatDST(dst: any) {
    let bulan = '';
    switch (Math.ceil(Number(dst) / 3)) {
      case 1:
        bulan = 'Januari';
        break;
      case 2:
        bulan = 'Februari';
        break;
      case 3:
        bulan = 'Maret';
        break;
      case 4:
        bulan = 'April';
        break;
      case 5:
        bulan = 'Mei';
        break;
      case 6:
        bulan = 'Juni';
        break;
      case 7:
        bulan = 'Juli';
        break;
      case 8:
        bulan = 'Agustus';
        break;
      case 9:
        bulan = 'September';
        break;
      case 10:
        bulan = 'Oktober';
        break;
      case 11:
        bulan = 'November';
        break;
      default:
        bulan = 'Desember';
    }
    return (
      (((Number(dst) - 1) % 3) + 1)
        .toString()
        .replace('1', 'Awal')
        .replace('2', 'Tengah')
        .replace('3', 'Akhir') +
      ' ' +
      bulan
    );
  }

  dstAdjust(dst: number, pola: string) {
    let arPola = pola.split('-');
    let aDst = dst;
    let flag = 0;
    for (let i = 0; i < arPola.length - 1; i++) {
      if (arPola[i] == '0' || arPola[i] == '4') {
        aDst = ((12 + aDst - 1) % 36) + 1;
        flag += 1;
      } else {
        break;
      }
    }
    if (
      (arPola[arPola.length - 1] == '0' || arPola[arPola.length - 1] == '4') &&
      flag === 2
    ) {
      aDst = 0;
    }
    return aDst;
  }

  groupBy = function (data: any, key: any) {
    // `data` is an array of objects, `key` is the key (or property accessor) to group by
    // reduce runs this anonymous function on each element of `data` (the `item` parameter,
    // returning the `storage` parameter at the end
    return data.reduce(function (storage: any, item: any) {
      // get the first instance of the key by which we're grouping
      var group = item[key];

      // set `storage` for this instance of group to the outer scope (if not empty) or initialize it
      storage[group] = storage[group] || [];

      // add this item to its group within `storage`
      storage[group].push(item);

      // return the updated storage to the reduce function, which will then loop through the next
      return storage;
    }, {}); // {} is the initial value of the storage
  };

  leaf = (col: string, obj: any) =>
    col.split('.').reduce((value, el) => value[el], obj);

  filterObject(obj: any, p: string, f: string, poi: string) {
    const filtered: any = obj.filter((item: any) => {
      return item[p].indexOf(f) >= 0;
    });

    let txt = '';
    filtered.forEach((item: any) => {
      return (txt = txt + ' - ' + item[poi].toString());
    });
    if (txt === '') {
      txt = ' - ';
    }
    return txt;
  }

  ceilNUMBER(n: number) {
    return Math.ceil(n);
  }

  renameKeys(obj: any, newKeys: any) {
    const keyValues = Object.keys(obj).map((key) => {
      const newKey = newKeys[key] || key;
      return { [newKey]: obj[key] };
    });
    return Object.assign({}, ...keyValues);
  }
}
