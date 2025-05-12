import { formatDate } from 'src/lib/helpers/date';
import { faker } from '@faker-js/faker';
import { Model, ModelArg } from '@decaf-ts/decorator-validation';
import { EmployeeModel } from '../models/EmployeeModel';
import { CategoryModel } from '../models/CategoryModel';
import { PaginatedQuery } from 'src/lib/engine/NgxBaseComponent';

const localStorage = globalThis.localStorage;



/**
 * @description Generic repository for managing fake data.
 * @summary FakerRepository provides a complete CRUD interface for managing
 * mock data in the browser's localStorage. It serves as a simulated backend
 * for development and testing purposes, supporting operations like create,
 * read, update, delete, and list. The repository extends the Model class
 * from @decaf-ts/decorator-validation for additional validation capabilities.
 *
 * @class FakerRepository<T>
 * @extends {Model}
 *
 * @mermaid
 * classDiagram
 *   class Model {
 *     <<abstract>>
 *   }
 *   class FakerRepository~T~ {
 *     -data: Record<string, T[]>
 *     -storageKey: string
 *     #table: string
 *     +constructor(table?: string, args?: ModelArg<Model>)
 *     -init(initialLength: number): Record<string, T[]>
 *     -getDb(): Record<string, T[]>
 *     -saveData(data: Record<string, T[]>): void
 *     +create(item: T): T | null
 *     +read(id: number): T | null
 *     +update(id: number, updatedItem: Partial<T>): T | null
 *     +delete(id: number): T | null
 *     +list(): T[]
 *   }
 *   Model <|-- FakerRepository
 *   FakerRepository <|-- EmployeeRepository
 *   FakerRepository <|-- CategoryRepository
 */
export class FakerRepository<T> extends Model {

  /**
   * @description In-memory storage for repository data.
   * @summary Holds the current state of all data tables managed by the repository.
   * This cache is synchronized with localStorage for persistence.
   *
   * @private
   * @type {Record<string, T[]>}
   * @memberOf FakerRepository
   */
  private data: T[] = [];

  /**
   * @description Key used for localStorage persistence.
   * @summary Defines the key under which all repository data is stored in the
   * browser's localStorage, enabling data persistence across page reloads.
   *
   * @private
   * @type {string}
   * @default "for_angular_faker_db"
   * @memberOf FakerRepository
   */
  private storageKey: string = 'for_angular_faker_db';

  /**
   * @description Name of the data table being managed.
   * @summary Identifies which specific data collection this repository instance
   * is responsible for managing within the overall data store.
   *
   * @protected
   * @type {string}
   * @memberOf FakerRepository
   */
  protected table!: string;

  private queryPage: number = 1;


  /**
   * @description Creates an instance of FakerRepository.
   * @summary Initializes the repository with an optional table name and model arguments.
   * If no data exists in localStorage, it initializes the database with default records.
   *
   * @param {string} [table] - The name of the table to manage
   * @param {ModelArg<Model>} [args={}] - Additional model arguments
   * @memberOf FakerRepository
   */
  constructor(table?: string, args: ModelArg<Model> = {}) {
    super(args);
    if(table)
      this.table = table;
    if(!Object.keys(this.data)?.length)
      this.init(100);
  }

  /**
   * @description Initializes the database with sample data.
   * @summary Creates initial records for the repository if none exist.
   * This method generates fake data for employees and categories and
   * stores it in localStorage for persistence.
   *
   * @private
   * @param {number} initialLength - Number of initial records to generate
   * @return {Record<string, T[]>} The initialized database
   *
   * @mermaid
   * sequenceDiagram
   *   participant FR as FakerRepository
   *   participant LS as localStorage
   *
   *   FR->>LS: Check if data exists
   *   alt No data exists
   *     FR->>FR: Generate employees and categories
   *     FR->>LS: Store initial data
   *   end
   *   FR->>FR: getDb()
   *   FR-->>FR: Return database
   *
   * @memberOf FakerRepository
   */
  private init(initialLength: number): void {
    if (!localStorage.getItem(this.storageKey)) {
      const initialData: Record<string, T[]> = {
        employees: generateEmployes() as T[],
        categories: generateCatories() as T[]
      };
      localStorage.setItem(this.storageKey, JSON.stringify(initialData));
    }
    this.data = this.getDb()[this.table] || [];;
  }

  /**
   * @description Retrieves the current database state from localStorage.
   * @summary Loads the current state of all data tables from localStorage
   * and updates the in-memory data cache. This ensures the repository
   * always works with the most current data.
   *
   * @private
   * @return {Record<string, T[]>} The current database state
   * @memberOf FakerRepository
   */
  private getDb(): Record<string, T[]> {
    return JSON.parse(localStorage.getItem(this.storageKey) || '{}');
  }

  /**
   * @description Persists data changes to localStorage.
   * @summary Saves the current state of all data tables to localStorage
   * and refreshes the in-memory cache to ensure consistency.
   *
   * @private
   * @param {Record<string, T[]>} data - The data to save
   * @return {void}
   * @memberOf FakerRepository
   */
  private saveData(data: Record<string, T[]>): void {
    localStorage.setItem(this.storageKey, JSON.stringify(data));
    this.getDb();
  }

  /**
   * @description Creates a new record in the repository.
   * @summary Adds a new item to the specified table with an automatically
   * generated ID. The ID is determined by finding the highest existing ID
   * and incrementing it by one.
   *
   * @param {T} item - The item to create
   * @return {T | null} The created item or null if the operation failed
   *
   * @mermaid
   * sequenceDiagram
   *   participant C as Client
   *   participant FR as FakerRepository
   *   participant DB as Database
   *
   *   C->>FR: create(item)
   *   FR->>DB: getDb()
   *   DB-->>FR: current data
   *   alt Table exists
   *     FR->>FR: Calculate new ID
   *     FR->>FR: Add new item to table
   *     FR->>DB: saveData(updated data)
   *     FR-->>C: Return new item
   *   else Table doesn't exist
   *     FR-->>C: Return null
   *   end
   *
   * @memberOf FakerRepository
   */
  create(item: T): T | null {
    const data = this.getDb();
    if (!data[this.table])
      return null;

    const highestId = data[this.table].length ? Math.max(...data[this.table].map(i => (i as T & {id: number}).id)) : 0;
    const newItem = { id: highestId + 1, ...item } as T;
    data[this.table].push(newItem);
    this.saveData(data);

    return newItem;
  }

  /**
   * @description Retrieves a specific record by ID.
   * @summary Finds and returns an item from the current table that matches
   * the provided ID. Returns null if no matching item is found.
   *
   * @param {number} id - The ID of the item to retrieve
   * @return {T | null} The found item or null if not found
   * @memberOf FakerRepository
   */
  read(id?: number): T | T[] | null {
    if(!id)
      return this.readAll() as T[];
    return this.data.find(item => (item as T & {id: number}).id === id) || null;
  }

  /**
   * @description Updates an existing record.
   * @summary Modifies an item in the specified table that matches the provided ID.
   * Only the properties included in the updatedItem parameter will be changed.
   *
   * @param {number} id - The ID of the item to update
   * @param {Partial<T>} updatedItem - The properties to update
   * @return {T | null} The updated item or null if the operation failed
   * @memberOf FakerRepository
   */
  update(id: number, updatedItem: Partial<T>): T | null {
    const data = this.getDb();
    if (!data[this.table])
      return null;

    const index = data[this.table].findIndex((item) => (item as T & {id: number}).id === id);
    if (index !== -1) {
      data[this.table][index] = { ...data[this.table][index], ...updatedItem };
      this.saveData(data);
      return data[this.table][index];
    }

    return null;
  }

  /**
   * @description Deletes a record from the repository.
   * @summary Removes an item from the specified table that matches the provided ID.
   * Returns the deleted item if successful, or null if the item wasn't found.
   *
   * @param {number} id - The ID of the item to delete
   * @return {T | null} The deleted item or null if not found
   * @memberOf FakerRepository
   */
  delete(id: number): T | null {
    const data = this.getDb();
    if (!data[this.table]) return null;

    const index = data[this.table].findIndex(item => (item as T & {id: number}).id === id);
    if (index !== -1) {
      const item = data[this.table].splice(index, 1)[0];
      this.saveData(data);
      return item;
    }

    return null;
  }

  /**
   * @description readAll all records in the repository.
   * @summary Retrieves all items from the current table.
   * Returns an empty array if the table doesn't exist.
   *
   * @return {T[]} Array of all items in the table
   * @memberOf FakerRepository
   */
  readAll(string?: []): T[] {
    return this.data || [];
  }

  async query(start: number, limit: number): Promise<PaginatedQuery> {
    return new Promise(resolve => {
      const res = {
        page: this.queryPage,
        total: this.data.length,
        data: this.data.slice(start, limit) as Model[]
      }
      this.queryPage++;
      return resolve(res)
    })
  }
}

/**
 * @description Generates fake employee data.
 * @summary Creates an array of Employee objects with randomized data
 * using the Faker library. Each employee has a unique ID, name, occupation,
 * birthdate, hire date, and creation timestamp.
 *
 * @param {number} [limit=100] - Maximum number of records to generate
 * @return {Employee[]} Array of generated employee records
 */
function generateEmployes(limit: number = 100): EmployeeModel[]{
  return getFakerData<EmployeeModel>(100, {
    name: faker.person.fullName,
    occupation: faker.person.jobTitle,
    birthdate: faker.date.birthdate,
    hiredAt: (random: number = Math.floor(Math.random() * 5) + 1) => faker.date.past({years: random})
  });
}

/**
 * @description Generates fake category data.
 * @summary Creates an array of Category objects with randomized data
 * using the Faker library. Each category has a unique ID, name,
 * and creation timestamp.
 *
 * @param {number} [limit=100] - Maximum number of records to generate
 * @return {Category[]} Array of generated category records
 */
function generateCatories(limit: number = 100): CategoryModel[] {
  return getFakerData<CategoryModel>(100, {
    name: faker.commerce.department
  });
}


/**
 * @description Generates typed fake data with consistent structure.
 * @summary Creates an array of typed objects with dynamically generated properties
 * using provided generator functions. Each object is assigned a sequential ID and
 * creation timestamp. This utility function serves as the core data generation
 * mechanism for the fake repositories, ensuring consistent structure across
 * different data types while allowing for type safety through generics.
 *
 * @template T - The type of objects to generate
 * @param {number} [limit=100] - Maximum number of records to generate
 * @param {Record<string, Function>} props - Object mapping property names to generator functions
 * @return {T[]} Array of generated records with consistent structure
 *
 * @mermaid
 * sequenceDiagram
 *   participant C as Caller
 *   participant G as getFakerData
 *   participant F as Faker
 *
 *   C->>G: getFakerData<T>(limit, props)
 *   G->>G: Create Array.from({ length: limit })
 *   loop For each array element
 *     G->>G: Create empty item object
 *     loop For each property in props
 *       G->>F: Execute generator function
 *       F-->>G: Return generated value
 *       alt Value is Date
 *         G->>G: Format date using formatDate()
 *       end
 *       G->>G: Assign value to item[key]
 *     end
 *     G->>G: Assign sequential ID
 *     G->>F: Generate createdAt timestamp
 *     G->>G: Increment index counter
 *     G->>G: Add item to result array
 *   end
 *   G-->>C: Return array of generated items
 *
 * @memberOf FakerRepository
 */
export function getFakerData<T>(limit: number = 100, model: Record<string, Function>): T[] {
  let index = 1;
  return Array.from({ length: limit }, () => {
    const item = {} as T & {id: number; createdAt: Date};
    for (const [key, value] of Object.entries(model)) {
      const val = value();
      item[key as keyof T] = val.constructor === Date ? formatDate(val) : val;
    }
    item.id = index;
    item.createdAt = faker.date.past({refDate: '2024-01-01'});
    index++;
    return item;
  })
}
