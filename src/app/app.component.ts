import { Component, OnInit } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

interface Solution {
  name: string;
  start_conc?: number;
  end_conc?: number;
  start_volume?: number;
  end_volume?: number;
  solved_for?: string;
}

function hasOnlyOneUnknown(solution: Solution): { valid: boolean, solve_for?: string } {
  const valid_props = ['start_conc', 'end_conc', 'start_volume', 'end_volume'];
  const keys = Object.keys(solution).filter(key => valid_props.includes(key));
  if (keys.length !== 4 && keys.length !== 3) {
    return { valid: false };
  }

  let count = 0;
  let solve_for = '';
  for (const key of valid_props) {
    if (!solution[key] || typeof solution[key] !== 'number') {
      count++;
      solve_for = key;
    }
  }
  if (count > 1) {
    return { valid: false };
  }
  return { valid: true, solve_for };
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'concentrations';
  end_volume = 100;

  solutions_source = new BehaviorSubject<Solution[]>([{
    name: 'Ethanol',
    start_conc: .95,
    end_conc: .5,
  },
    // test invalid
  ]);

  solutions$ = this.solutions_source.pipe(
    map(solutions => this.recalculate(solutions))
  );

  displayed_columns_source = new BehaviorSubject<string[]>([
    'name',
    'start_conc',
    'end_conc',
    'start_volume',
    'end_volume',
    'solved_for',
  ]);
  displayed_columns$ = this.displayed_columns_source.asObservable();
  errorText = '';
  errorSolutions: string[] = [];

  ngOnInit() {

  }

  refresh() {
    this.solutions_source.next(this.solutions_source.getValue());
  }

  removeSolution(name: string) {
    this.solutions_source.next(this.solutions_source.getValue().filter(s => s.name !== name));
  }

  addSolution(name: string) {
    const current = this.solutions_source.getValue();
    if (current.some(s => s.name === name)) {
      return;
    }
    current.push({ name });
    this.solutions_source.next(current);
  }

  isBadSolution(name: string) {
    return this.errorSolutions.includes(name);
  }

  recalculate(solutions: Solution[]): Solution[] {
    // validate everything
    const end_volume = this.end_volume;
    console.log('start solutions', solutions);
    console.log('end_volume', this.end_volume);
    solutions.forEach(s => s.end_volume = this.end_volume);

    this.errorSolutions = [];
    this.errorText = '';
    const validated = solutions.map((s) => hasOnlyOneUnknown(s));
    validated.forEach((v, i) => {
      if (!v.valid) {
        this.errorSolutions.push(solutions[i].name);
      }
    });
    if (validated.some(s => !s.valid)) {
      this.errorText = 'Ensure every solution only has one unknown';
      console.log('error', this.errorText);
      return solutions;
    }

    // calculate the unknonws for each
    solutions.forEach((s) => {
      const { valid, solve_for } = hasOnlyOneUnknown(s);
      s.solved_for = solve_for;
      console.log('solving for', s.name, solve_for, valid);

      try {
        switch (solve_for) {
          case 'start_conc':
            s.start_conc = (s.end_conc * s.end_volume) / s.start_volume;
            break;
          case 'end_conc':
            s.end_conc = (s.start_conc * s.start_volume) / s.end_volume;
            break;
          case 'start_volume':
            s.start_volume = (s.end_conc * s.end_volume) / s.start_conc;
            break;
        }
      } catch (e) {
        console.log(e);
        this.errorSolutions.push(s.name);
      }
    });

    console.log('end solutions', solutions);
    return solutions;
  }
}
