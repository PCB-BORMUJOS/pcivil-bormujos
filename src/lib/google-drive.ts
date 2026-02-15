import { google } from 'googleapis'
import { Stream } from 'stream'

// ID de la carpeta compartido por el usuario
const FOLDER_ID = '1I0i96umQtLaTBLUg1Om_Wx6PlxfjQbRQ'
const KEY_FILE_PATH = process.cwd() + '/secrets/google.json'

// Scopes necesarios para subir y compartir archivos
const SCOPES = ['https://www.googleapis.com/auth/drive.file']

/**
 * Autentica y devuelve el cliente de Google Drive
 */
const getDriveClient = async () => {
    const auth = new google.auth.GoogleAuth({
        keyFile: KEY_FILE_PATH,
        scopes: SCOPES,
    })
    return google.drive({ version: 'v3', auth })
}

/**
 * Sube un archivo PDF a Google Drive
 * @param buffer Buffer del archivo PDF
 * @param filename Nombre del archivo
 * @param mimeType Tipo MIME (application/pdf)
 * @param folderId ID de la carpeta de Drive (opcional)
 * @returns Objeto con id y webViewLink
 */
export async function uploadToGoogleDrive(
    buffer: Buffer,
    filename: string,
    mimeType: string = 'application/pdf',
    folderId?: string
) {
    try {
        const drive = await getDriveClient()
        const targetFolderId = folderId || FOLDER_ID

        // Convertir buffer a stream
        const bufferStream = new Stream.PassThrough()
        bufferStream.end(buffer)

        const response = await drive.files.create({
            requestBody: {
                name: filename,
                parents: [targetFolderId], // Carpeta destino
            },
            media: {
                mimeType,
                body: bufferStream,
            },
            fields: 'id, name, webViewLink, webContentLink',
        })

        // Hacer el archivo legible por cualquiera con el link (opcional, pedir confirmación)
        // O dejarlo privado y que solo los usuarios de la carpeta compartida lo vean.
        // Dado que la carpeta ya está compartida, heredará permisos.

        return {
            fileId: response.data.id,
            url: response.data.webViewLink,
            downloadUrl: response.data.webContentLink
        }
    } catch (error) {
        console.error('Error subiendo a Google Drive:', error)
        throw error
    }
}
