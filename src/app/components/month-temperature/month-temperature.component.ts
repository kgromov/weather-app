import {Component, Inject, LOCALE_ID, OnDestroy, OnInit} from '@angular/core';
import {MONTH_NAMES, MonthName, MonthTemperature} from "../../model/season-data";
import {YEAR_SUMMARY_CHART_CONFIG} from "../../model/chart-config";
import {FormBuilder, FormControl, FormGroup} from "@angular/forms";
import {WeatherServiceService} from "../../services/weather-service.service";
import {TemperatureService} from "../../services/temperature.service";
import {Subject} from "rxjs";
import {takeUntil} from "rxjs/operators";
import {ChartDataset} from "chart.js";
import {AbstractTemperatureDirective} from "../abstract-temperature.directive";


@Component({
  selector: 'month-temperature',
  templateUrl: './month-temperature.component.html',
  styleUrls: ['../../app.component.css']
})
export class MonthTemperatureComponent extends AbstractTemperatureDirective<MonthTemperature> implements OnInit, OnDestroy {

  availableYears: number [] = [];
  private $subject: Subject<void> = new Subject<void>();
  // @ts-ignore
  form: FormGroup;
  monthItems: MonthName[] = MONTH_NAMES.map((value, index) => ({name: value, value: index}))

  constructor(@Inject(LOCALE_ID) protected override locale: string,
              protected override weatherService: WeatherServiceService,
              private seasonService: TemperatureService,
              private fb: FormBuilder) {
    super(locale, weatherService);
    this.chartConfig = {...YEAR_SUMMARY_CHART_CONFIG, type: 'bar'};
  }

  ngOnInit(): void {
    const currentYear: number = new Date().getUTCFullYear();
    const currentMonth: number = new Date().getUTCMonth();
    this.form = this.fb.group({
      year: currentYear,
      month: this.monthItems[currentMonth]
    });
    this.form.valueChanges
      .pipe(takeUntil(this.$subject))
      .subscribe(value => {
        console.log('Selected year and month = ', JSON.stringify(value));
        this.fetchChartData();
      });
    this.fetchChartData();

    this.weatherService.getYearsToShow()
      .subscribe(yearsRange => {
        console.log('Years range = ', yearsRange);
        this.availableYears = [...Array(yearsRange).keys()].map(i => currentYear - i)
      });
  }

  private fetchChartData(): void {
    const year = this.year.value;
    const month = this.month.value.value;
    console.log(`Selected year = ${JSON.stringify(year)} and month = ${JSON.stringify(month)}`);
    this.seasonService.getYearMonthTemperature(year, month)
      .subscribe(data => {
        this.data = data;
        this.updateChartData(data);
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

  onYearsChanged(year: number) {
    console.log('Selected year = ', year);
    this.year.setValue(year);
  }

  protected updateChartData(data: MonthTemperature[]) {
    // @ts-ignore
    const currentMonthIndex: number = this.month.value?.value || 0;
    console.log('currentMonthIndex = ', currentMonthIndex);
    const labelsData: any[] = [];
    const minData: any[] = [];
    const averageData: any[] = [];
    const maxData: any[] = [];
    data
      .forEach(day => {
        console.log('day = ', day);
        labelsData.push(day.day);
        minData.push(day.minTemp);
        averageData.push(day.avgTemp);
        maxData.push(day.maxTemp);
      });

    this.chartConfig.data.labels = [...labelsData];
    const datasets: ChartDataset[] = this.chartConfig.data.datasets;
    datasets[0].data = [...minData];
    datasets[1].data = [...averageData];
    datasets[2].data = [...maxData];
    console.log('Chart data: ', this.chartConfig);
    // to trigger refresh
    this.chart.updateChart();
  }

  get year(): FormControl {
    return this.form.get('year') as FormControl;
  }

  get month(): FormControl {
    return this.form.get('month') as FormControl;
  }

  get monthName(): string {
    return this.month.value?.name;
  }
}
