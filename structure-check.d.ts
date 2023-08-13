
export type StructureTypes = {
    [property: string]: StructureTypes | StructureType
}

export type StructureType = 'string' | 'number' | 'bigint' | 'boolean'

function CheckStructure(obj: any, types: StructureTypes): boolean

export = CheckStructure
