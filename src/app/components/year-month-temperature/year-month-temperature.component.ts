import {Component, Inject, LOCALE_ID, OnDestroy, OnInit} from '@angular/core';
import {MONTH_NAMES, MonthName, YearByMonthTemperature, YearMonthTemperature} from "../../model/season-data";
import {YEAR_SUMMARY_CHART_CONFIG} from "../../model/chart-config";
import {FormBuilder, FormControl, FormGroup} from "@angular/forms";
import {WeatherServiceService} from "../../services/weather-service.service";
import {TemperatureService} from "../../services/temperature.service";
import {Subject} from "rxjs";
import {takeUntil} from "rxjs/operators";
import {ChartDataset} from "chart.js";
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
