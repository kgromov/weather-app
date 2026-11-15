import {Directive, Inject, LOCALE_ID, ViewChild} from '@angular/core';
import {DEFAULT_CONFIG, ExportChart} from "../model/chart-config";
import {WeatherServiceService} from "../services/weather-service.service";
import {ChartjsComponent} from "@ctrl/ngx-chartjs";
import {ActiveElement, Chart, ChartData, ChartDataset, ChartEvent, ScriptableContext} from "chart.js";
import {AggregateType} from "../model/season-data";
import {formatDate} from "@angular/common";

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


  protected chartConfigOverrides(chartConfig: ExportChart, dateFormatFn: (dates: string[]) => string): ExportChart {
    const plugins: any = {
      tooltip: {
        enabled: true,
        position: 'nearest',
        // external: (context: TooltipModel<any> ) => {
        //   // Tooltip Element
        //   const  { chart: Chart; tooltip: TooltipModel<TType> } = this.context;
        // },
        callbacks: {
          label: (context: ScriptableContext<any>) => {
            console.trace('callback', context);
            let label = context.dataset.label || '';
            console.trace('label = ', label);
            if (this.data?.length > 0) {
              const aggregation: AggregateType = Object.values(AggregateType)[context.datasetIndex];
              switch (aggregation) {
                case AggregateType.MIN:
                  // @ts-ignore
                  const minDate = dateFormatFn(this.data[context.dataIndex]['minTempDates']);
                  label = `${label}: ${context.raw} (${minDate})`;
                  break;
                case AggregateType.MAX:
                  // @ts-ignore
                  const maxDate = dateFormatFn(this.data[context.dataIndex]['maxTempDates']);
                  label = `${label}: ${context.raw} (${maxDate})`;
                  break;
                case AggregateType.AVG:
                  label = `${label}: ${Math.round((context.raw as number) * 100) / 100}`;
                  break;
              }
            }
            console.trace('modified label = ', label);
            return label;
          }
        }
      },
      legend: {
        display: true,
        position: 'top',
        labels: {
          font: {
            size: 14
          }
        }
      },
     /* onClick: (event: ChartEvent, elements: ActiveElement[], chart: Chart) => {
        this.onPointClicked(event, elements, chart)
      }*/
    }
    const optionsOverrides: any = {
      ...chartConfig.options,
      plugins: plugins,
    };
    return {
      ...chartConfig,
      options: optionsOverrides
    };
  }

  protected onPointClicked(event: ChartEvent, elements: ActiveElement[], chart: Chart): void {
    const selectedElements: ActiveElement[] = elements as ActiveElement[];
    if (selectedElements.length <= 0) {
      return;
    }
    const selectedElement: ActiveElement = selectedElements[0];
    console.log(selectedElement.element);
    const datasetIndex: number = selectedElement.datasetIndex;
    const pointIndex: number = selectedElement.index;

    const data: ChartData = chart.config.data as ChartData;
    const dataset: ChartDataset[] = data.datasets;

    const dataObject: any = dataset[datasetIndex].data[pointIndex];
  }

  protected formatToMonthDay = (extremumDates: string[] = []): string =>
    extremumDates
      .map(date => formatDate(new Date(date), 'MMM, dd', this.locale))
      .join('; ');

  protected formatToDay = (extremumDates: string[] = []): string =>
    extremumDates
      .map(date => formatDate(new Date(date), 'dd', this.locale))
      .join('; ');

}
