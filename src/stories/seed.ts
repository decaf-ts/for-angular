import { Repository } from '@decaf-ts/core';
import { RamAdapter, RamFlavour } from '@decaf-ts/core/ram';
import { CategoryModel } from 'src/app/models/CategoryModel';
import { ForAngularModel } from 'src/app/models/DemoModel';
import { EmployeeModel } from 'src/app/models/EmployeeModel';
import { MedicationScheduleModel } from 'src/app/models/MedicationScheduleModel';
import { UserModel } from 'src/app/models/UserModel';
import { TableDemoModel } from './table-demo.model';

/**
 * @description Storybook-only seed helper.
 * @summary Registers a `RamAdapter` instance with the `ram` flavour and pre-populates the
 * repositories used by the repo-driven Storybook stories (list, table, filter, crud form and
 * model renderer). Seeding is idempotent: the adapter and repositories are only created once
 * per Storybook module session, so mutating stories (edit/delete) persist against the same
 * in-memory data until the page is reloaded.
 */

let adapter: RamAdapter | undefined;
let seeding: Promise<void> | undefined;

function ensureRamAdapter(): RamAdapter {
  if (adapter) {
    return adapter;
  }

  // The engine only resolves repositories when a RamAdapter instance is registered under the
  // `ram` flavour. Creating a second instance on hot reload throws "already registered", in
  // which case the previously registered instance is already in the cache and we keep using it.
  try {
    adapter = new RamAdapter();
  } catch (e: unknown) {
    adapter = undefined;
  }
  RamAdapter.setCurrent(RamFlavour);
  return adapter as RamAdapter;
}

async function seedCategories(): Promise<void> {
  const repo = Repository.forModel(CategoryModel);
  const names = [
    'West Coast Vegan',
    'Fast Food',
    'Desserts',
    'Drinks',
    'Seafood',
    'Pasta & Risotto',
    'Salads',
    'Steakhouse',
    'Brunch',
    'Coffee & Tea',
    'Sushi',
    'Tapas',
    'French',
    'Indian',
    'Mexican',
  ];
  const now = new Date();
  const samples: unknown[] = names.map((name, index) => ({
    id: index + 1,
    name,
    description: `${name}: sample menu category for the Storybook seed data.`,
    createdAt: new Date(now.getTime() - (index + 1) * 86400000),
  }));
  for (const sample of samples) {
    await repo.create(sample as CategoryModel);
  }
}

async function seedEmployees(): Promise<void> {
  const repo = Repository.forModel(EmployeeModel);
  const now = new Date();
  const samples: unknown[] = [
    {
      id: 1,
      name: 'Alice Martins',
      occupation: 'Software Engineer',
      birthdate: '1990-03-14',
      hiredAt: new Date('2021-01-04'),
      createdAt: new Date(now.getTime() - 86400000),
      updateAt: new Date(now.getTime() - 86400000),
    },
    {
      id: 2,
      name: 'Bruno Costa',
      occupation: 'Backend Developer',
      birthdate: '1988-07-22',
      hiredAt: new Date('2020-02-17'),
      createdAt: new Date(now.getTime() - 2 * 86400000),
      updateAt: new Date(now.getTime() - 2 * 86400000),
    },
    {
      id: 3,
      name: 'Carla Silva',
      occupation: 'QA Engineer',
      birthdate: '1992-11-30',
      hiredAt: new Date('2021-08-02'),
      createdAt: new Date(now.getTime() - 3 * 86400000),
      updateAt: new Date(now.getTime() - 3 * 86400000),
    },
    {
      id: 4,
      name: 'Diogo Pereira',
      occupation: 'Product Manager',
      birthdate: '1985-05-09',
      hiredAt: new Date('2019-10-14'),
      createdAt: new Date(now.getTime() - 4 * 86400000),
      updateAt: new Date(now.getTime() - 4 * 86400000),
    },
    {
      id: 5,
      name: 'Elsa Carvalho',
      occupation: 'Frontend Developer',
      birthdate: '1994-09-18',
      hiredAt: new Date('2022-03-21'),
      createdAt: new Date(now.getTime() - 5 * 86400000),
      updateAt: new Date(now.getTime() - 5 * 86400000),
    },
    {
      id: 6,
      name: 'Filipe Gomes',
      occupation: 'Software Engineer',
      birthdate: '1987-12-05',
      hiredAt: new Date('2018-06-11'),
      createdAt: new Date(now.getTime() - 6 * 86400000),
      updateAt: new Date(now.getTime() - 6 * 86400000),
    },
  ];
  for (const sample of samples) {
    await repo.create(sample as EmployeeModel);
  }
}

function registerRepositories(): void {
  // Make sure the repositories for the CRUD/model-renderer stories resolve through
  // getModelAndRepository() even when they are not pre-populated with records.
  Repository.forModel(ForAngularModel);
  Repository.forModel(UserModel);
  Repository.forModel(MedicationScheduleModel);
}

async function seedTableRows(): Promise<void> {
  const repo = Repository.forModel(TableDemoModel);
  const samples: unknown[] = [
    {
      id: 1,
      name: 'West Coast Vegan',
      description: 'Plant-based bowls, wraps and smoothies.',
      createdAt: new Date('2024-01-10T10:00:00'),
    },
    {
      id: 2,
      name: 'Fast Food',
      description: 'Burgers, fries and milkshakes.',
      createdAt: new Date('2024-01-11T10:00:00'),
    },
    {
      id: 3,
      name: 'Desserts',
      description: 'Cakes, pastries and gelato.',
      createdAt: new Date('2024-01-12T10:00:00'),
    },
    {
      id: 4,
      name: 'Drinks',
      description: 'Soft drinks, juices and freshly brewed coffee.',
      createdAt: new Date('2024-01-13T10:00:00'),
    },
    {
      id: 5,
      name: 'Seafood',
      description: 'Fresh fish and shellfish dishes.',
      createdAt: new Date('2024-01-14T10:00:00'),
    },
    {
      id: 6,
      name: 'Pasta & Risotto',
      description: 'Homemade pasta and creamy risottos.',
      createdAt: new Date('2024-01-15T10:00:00'),
    },
    {
      id: 7,
      name: 'Salads',
      description: 'Crisp seasonal salads with house dressings.',
      createdAt: new Date('2024-01-16T10:00:00'),
    },
    {
      id: 8,
      name: 'Steakhouse',
      description: 'Premium cuts grilled to order.',
      createdAt: new Date('2024-01-17T10:00:00'),
    },
    {
      id: 9,
      name: 'Brunch',
      description: 'Weekend brunch classics with bottomless coffee.',
      createdAt: new Date('2024-01-18T10:00:00'),
    },
    {
      id: 10,
      name: 'Coffee & Tea',
      description: 'Specialty coffee and loose leaf teas.',
      createdAt: new Date('2024-01-19T10:00:00'),
    },
  ];
  for (const sample of samples) {
    await repo.create(sample as TableDemoModel);
  }
}

/**
 * @description Seeds the Storybook RamAdapter repositories with sample models.
 * @summary Idempotent: only seeds once per page session. Safe to call from `setup.ts` and from
 * individual stories that need to guarantee data before mounting.
 */
export function seedRamData(): Promise<void> {
  if (!seeding) {
    ensureRamAdapter();
    registerRepositories();
    seeding = (async () => {
      await seedCategories();
      await seedEmployees();
      await seedTableRows();
    })();
  }
  return seeding;
}
