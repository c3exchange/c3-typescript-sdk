import { expect } from 'chai'
import { ClientErrorDefinition, ClientErrors } from "../src"


describe("ClientErrors tests", () => {
    it('Should have unique Error codes',()=>{
        const map = new Map()
        for (const errorDefinition of Object.values(ClientErrors)){
            const existing: ClientErrorDefinition | undefined = map.get(errorDefinition.id)
            if(existing !== undefined){
                throw new Error(`Duplicated Id ${errorDefinition.id} found between errors ${errorDefinition.message} and ${existing.message}`)
            }else {
              map.set(errorDefinition.id, errorDefinition)
            }
        }
    })
})