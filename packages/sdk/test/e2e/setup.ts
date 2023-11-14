import { C3SDKConfig } from "../../src";


export const localTestConfig: C3SDKConfig = {
    algorand_node: {
        server: "http://localhost", 
        port: 4001, 
        token: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" 
    },
    c3_api: {
        server: "http://localhost:3000/v1",
        wormhole_network: "DEVNET"
    }
}