import crypto from 'crypto'

const AES_256_GCM_WEB = "AES-GCM"
const AES_256_GCM = 'aes-256-gcm'
const HEX_ENCODING = 'hex'
const IV_LENGTH = 12

const importKey = async (rawKey: Uint8Array) => {
    // @ts-ignore
    const key = await getWindowObj().crypto.subtle.importKey(
        "raw", new Uint8Array(rawKey),
        { name: AES_256_GCM_WEB },
        true, ["encrypt", "decrypt"]
    );

    return key
}

// @ts-ignore
const getWindowObj = () => window
// @ts-ignore
const isBrowser = () => typeof window !== 'undefined' && typeof window.document !== 'undefined';

class CryptoUtilsWeb {
    static async encrypt (masterkey: Uint8Array, valueToEncrypt: Uint8Array): Promise<string> {
        // @ts-ignore
        const iv = getWindowObj().crypto.getRandomValues(new Uint8Array(IV_LENGTH))
        const key = await importKey(masterkey)
        // @ts-ignore
        const encryptedData = await getWindowObj().crypto.subtle.encrypt(
            { name: AES_256_GCM_WEB, iv },
            key, valueToEncrypt,
        );
        const encrypted = Buffer.from(encryptedData).toString(HEX_ENCODING)
        return `${Buffer.from(iv).toString(HEX_ENCODING)}:${encrypted}`
    }

    static async decrypt (masterkey: Uint8Array, valueToDecrypt: string): Promise<Uint8Array> {
        const parts = valueToDecrypt.split(':')
        const iv = new Uint8Array(Buffer.from(parts[0], HEX_ENCODING))
        const encryptedText = new Uint8Array(Buffer.from(parts[1], HEX_ENCODING))
        const key = await importKey(masterkey)
        // @ts-ignore
        const encryptedData = await getWindowObj().crypto.subtle.decrypt(
            { name: AES_256_GCM_WEB, iv },
            key, encryptedText,
        );
        return new Uint8Array(encryptedData)
    }
}

class CryptoUtilsNode {
    static async encrypt (masterkey: Uint8Array, valueToEncrypt: Uint8Array): Promise<string> {
        const iv = crypto.randomBytes(IV_LENGTH)
        const cipher = crypto.createCipheriv(AES_256_GCM, masterkey, iv)
        const encrypted = Buffer.concat([cipher.update(valueToEncrypt), cipher.final()]).toString(HEX_ENCODING)
        const authTag = cipher.getAuthTag().toString(HEX_ENCODING)

        // Return IV, auth tag, and encrypted data, concatenated
        return `${iv.toString(HEX_ENCODING)}:${authTag}:${encrypted}`
    }

    static async decrypt (masterkey: Uint8Array, valueToDecrypt: string): Promise<Uint8Array> {
        // Split IV, auth tag, and data
        const parts = valueToDecrypt.split(':')
        const iv = Buffer.from(parts[0], HEX_ENCODING)
        const authTag = Buffer.from(parts[1], HEX_ENCODING)
        const encryptedText = Buffer.from(parts[2], HEX_ENCODING)
        const decipher = crypto.createDecipheriv(AES_256_GCM, masterkey, iv)
        decipher.setAuthTag(authTag)
        const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()])
        return new Uint8Array(decrypted)
    }
}

interface CryptoUtils {
    encrypt: (masterkey: Uint8Array, valueToEncrypt: Uint8Array) => Promise<string>
    decrypt: (masterkey: Uint8Array, valueToDecrypt: string) => Promise<Uint8Array>
}

const cryptoUtilsBuilder = (): CryptoUtils => {
    if (isBrowser()) {
        return {
            encrypt: CryptoUtilsWeb.encrypt,
            decrypt: CryptoUtilsWeb.decrypt,
        }
    }

    return {
        encrypt: CryptoUtilsNode.encrypt,
        decrypt: CryptoUtilsNode.decrypt,
    }
}

export {
    cryptoUtilsBuilder,
}