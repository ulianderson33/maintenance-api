import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { config } from '../config/index.js';

export class BaseJsonRepository {
  /**
   * @param {string} fileName — например, 'equipment.json'
   */
  constructor(fileName) {
    this.filePath = path.join(config.dataDir, fileName);
  }

  async #readAll() {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      return JSON.parse(raw);
    } catch (err) {
      if (err.code === 'ENOENT') return [];
      throw err;
    }
  }

  async #writeAll(items) {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(items, null, 2), 'utf8');
  }

  async findAll() {
    return this.#readAll();
  }

  async findById(id) {
    const all = await this.#readAll();
    return all.find((x) => x.id === id) ?? null;
  }

  async findOne(predicate) {
    const all = await this.#readAll();
    return all.find(predicate) ?? null;
  }

  async findMany(predicate) {
    const all = await this.#readAll();
    return all.filter(predicate);
  }

  async create(data) {
    const all = await this.#readAll();
    const now = new Date().toISOString();
    const item = {
      id: randomUUID(),
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    all.push(item);
    await this.#writeAll(all);
    return item;
  }

  async update(id, patch) {
    const all = await this.#readAll();
    const i = all.findIndex((x) => x.id === id);
    if (i === -1) return null;

    const updated = {
      ...all[i],
      ...patch,
      id: all[i].id, // защита: id нельзя изменить
      createdAt: all[i].createdAt, // защита: createdAt нельзя изменить
      updatedAt: new Date().toISOString(),
    };
    all[i] = updated;
    await this.#writeAll(all);
    return updated;
  }

  async remove(id) {
    const all = await this.#readAll();
    const i = all.findIndex((x) => x.id === id);
    if (i === -1) return false;
    all.splice(i, 1);
    await this.#writeAll(all);
    return true;
  }
}
