import { LazyStore, load, type Store } from '@tauri-apps/plugin-store';



export class Storage<T extends { [key: string]: unknown; }> {
    path:string
    store: Store | LazyStore | null = null
    type: "normal" | "lazy" = "normal"
    defaults: T = {} as T
    constructor(path:string, type: "normal" | "lazy" = "normal", defaults: T = {} as T) {
        this.path = path
        this.type = type
        this.defaults = defaults
        this.store = null
        this.init(type, defaults)
    }
    async init(type: "normal" | "lazy" = "normal", defaults: T = {} as T) {
        if (type === "normal") {
            this.store = await load(this.path, {autoSave: false, defaults: defaults})
            
        } else {
            this.store = new LazyStore(this.path, {autoSave: false, defaults: defaults})
            
        }
    }
    async get<K extends keyof T>(key: K): Promise<T[K] | null | undefined> {
        const store = await this.ensureInitialized()
        if (!store) {
            return null
        }
        return store.get<T[K]>(String(key))
    }
    async set<K extends keyof T>(key: K, value: T[K]) {
        const store = await this.ensureInitialized()
        if (!store) {
            return
        }
        store.set(String(key), value)
        await this.save()
    }
    async has(key: keyof T) {
        const store = await this.ensureInitialized()
        if (!store) {
            return false
        }
        return store.has(String(key))
    }
    async delete(key: keyof T) {
        const store = await this.ensureInitialized()
        if (!store) {
            return
        }
        store.delete(String(key))
        await this.save()
    }
    async clear() {
        const store = await this.ensureInitialized()
        if (!store) {
            return
        }
        store.clear()
        await this.save()
    }
    async keys() {
        const store = await this.ensureInitialized()
        if (!store) {
            return []
        }
        return store.keys()            
    }
    async save() {
        const store = await this.ensureInitialized()
        if (!store) {
            return
        }
        await store.save()
    }

    async loadAllData<V = T[keyof T]>() {
        const store = await this.ensureInitialized()
        if (!store) {
            return []
        }
        return store.entries<V>()
    }

    async bundleOperations(operations: {type: "set" | "delete", key: keyof T, value?: T[keyof T]}[]) {
        const store = await this.ensureInitialized()
        if (!store) {
            return
        }
        for (const operation of operations) {
            if (operation.type === "set") {
                store.set(String(operation.key), operation.value)
            } else if (operation.type === "delete") {
                store.delete(String(operation.key))
            }
        }
        await this.save()
    }

    async ensureInitialized() {
        if (!this.store) {
            await this.init(this.type, this.defaults)
            if (!this.store) {
                return false
            }
            return  this.store
        }
        return this.store
    }
}

