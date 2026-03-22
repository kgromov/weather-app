import {Directive, Inject, LOCALE_ID, ViewChild} from '@angular/core';
import {DEFAULT_CONFIG, ExportChart} from "../model/chart-config";
import {WeatherServiceService} from "../services/weather-service.service";
import {ChartjsComponent} from "@ctrl/ngx-chartjs";

@Directive({
  selector: '[abstractTemperature]'
})
export abstract class AbstractTemperatureDirective<T> {
  protected chartConfig: ExportChart = {...DEFAULT_CONFIG};
  protected data: T[] = [];
  // @ts-ignore
  @ViewChild(ChartjsComponent, {static: false}) protected chart: ChartjsComponent;

  protected constructor(
    @Inject(LOCALE_ID) protected locale: string,
    protected weatherService: WeatherServiceService
  ) {
  }

  protected abstract updateChartData(data: T[]): void;

}
