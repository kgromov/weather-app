import {Component, Inject, LOCALE_ID, OnDestroy, OnInit} from '@angular/core';
import {
  AggregateType,
  MONTH_NAMES,
  MonthName,
  YearByMonthTemperature,
  YearMonthTemperature
} from "../../model/season-data";
import {ExportChart, YEAR_SUMMARY_CHART_CONFIG} from "../../model/chart-config";
import {FormBuilder, FormControl, FormGroup} from "@angular/forms";
import {WeatherServiceService} from "../../services/weather-service.service";
import {TemperatureService} from "../../services/temperature.service";
import {Subject} from "rxjs";
import {takeUntil} from "rxjs/operators";
import {ChartDataset, ScriptableContext} from "chart.js";
import {AbstractTemperatureDirective} from "../abstract-temperature.directive";

@Component({
  selector: 'year-month-temperature',
  templateUrl: './year-month-temperature.component.html',
  styleUrls: ['../../app.component.css']
})
export class YearMonthTemperatureComponent extends AbstractTemperatureDirective<YearByMonthTemperature> implements OnInit, OnDestroy {

  availableYears: number [] = [];
  yearsRange: number = 0;
  private $subject: Subject<void> = new Subject<void>();
  // @ts-ignore
  form: FormGroup;
  monthItems: MonthName[] = MONTH_NAMES.map((value, index) => ({name: value, value: index + 1}))

  constructor(@Inject(LOCALE_ID) protected override locale: string,
              protected override  weatherService: WeatherServiceService,
              private seasonService: TemperatureService,
              private fb: FormBuilder) {
    super(locale, weatherService);
    this.chartConfig = {...YEAR_SUMMARY_CHART_CONFIG};
  }

  ngOnInit(): void {
    const currentMonth: number = new Date().getMonth();
    this.form = this.fb.group({
      month: this.monthItems[currentMonth]
    });

    this.chartConfig = this.chartConfigOverrides(YEAR_SUMMARY_CHART_CONFIG, dates => this.formatToDay(dates));
    this.weatherService.getYearsToShow()
      .subscribe(yearsRange => {
        console.log('Years range = ', yearsRange);
        this.availableYears = [...Array(yearsRange).keys()].map(i => i + 1)
      });

    this.seasonService.getYearMonthSummaryTemperature()
      .subscribe(data => {
        this.data = data;
        this.updateChartData(data);
      });

    this.month.valueChanges
      .pipe(takeUntil(this.$subject))
      .subscribe(value => {
        console.log('Selected month = ', JSON.stringify(value));
        this.updateChartData(this.data);
      });
  }

  ngOnDestroy(): void {
    this.$subject.next();
    this.$subject.complete();
  }

  // it's kind of workaround in reactive forms but does not work from form to component
  onMonthChanged(month: MonthName) {
    console.log('Selected month = ', month.name);
    this.month.setValue(month);
  }

  protected override chartConfigOverrides(chartConfig: ExportChart, dateFormatFn: (dates: string[]) => string): ExportChart {
    const plugins: any = {
      tooltip: {
        enabled: true,
        position: 'nearest',
        callbacks: {
          label: (context: ScriptableContext<any>) => {
            console.trace('callback', context);
            let label = context.dataset.label || '';
            console.trace('label = ', label);
            if (this.data?.length > 0) {
              const aggregation: AggregateType = Object.values(AggregateType)[context.datasetIndex];
              const selectedMonthIndex = this.form.get('month')?.value?.value - 1;
              const month: YearMonthTemperature = this.data[context.dataIndex].months[selectedMonthIndex];
              console.debug(`yearIndex = ${context.dataIndex}, aggregationIndex = ${context.datasetIndex}, selectedMonth = ${JSON.stringify(this.form.value)}`);
              console.debug(`Aggregation = ${aggregation}, month = ${JSON.stringify(month)}`);
              switch (aggregation) {
                case AggregateType.MIN:
                  // @ts-ignore
                  const minDate = dateFormatFn(month.minTempDates);
                  label = `${label}: ${context.raw} (${minDate})`;
                  break;
                case AggregateType.MAX:
                  // @ts-ignore
                  const maxDate = dateFormatFn(month.maxTempDates);
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
      }
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

  protected updateChartData(data: YearByMonthTemperature[]) {
    // @ts-ignore
    const currentMonthIndex: number = this.month.value?.value || 0;
    console.log('currentMonthIndex = ', currentMonthIndex);
    const labelsData: any[] = [];
    const minData: any[] = [];
    const averageData: any[] = [];
    const maxData: any[] = [];
    data
      .forEach(yearMonths => {
        console.log('year months = ', yearMonths);
        const months: YearMonthTemperature[] = yearMonths.months;
        // @ts-ignore
        const currentMonth: YearMonthTemperature = months.find(it => it.month === currentMonthIndex);
        if (!!currentMonth) {
          labelsData.push(yearMonths.year);
          minData.push(currentMonth.minTemp);
          averageData.push(currentMonth.avgTemp);
          maxData.push(currentMonth.maxTemp);
        }
      });
    this.yearsRange = labelsData.length;

    this.chartConfig.data.labels = [...labelsData];
    const datasets: ChartDataset[] = this.chartConfig.data.datasets;
    datasets[0].data = [...minData];
    datasets[1].data = [...averageData];
    datasets[2].data = [...maxData];
    console.log('Chart data: ', this.chartConfig);
    // to trigger refresh
    this.chart.updateChart();
  }

  get month(): FormControl {
    return this.form.get('month') as FormControl;
  }

  get monthName(): string {
    return this.month.value?.name;
  }
}
