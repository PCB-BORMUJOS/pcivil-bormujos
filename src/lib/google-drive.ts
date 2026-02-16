import { google } from 'googleapis'
import { Stream } from 'stream'

const FOLDER_ID = '10X11xzEnPc75OdGBNZvZiiEfzP_3wj0h'
const SCOPES = ['https://www.googleapis.com/auth/drive']

const getDriveClient = async () => {
    let credentials

    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        try {
            credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)
        } catch (error) {
            console.error('❌ Error al parsear GOOGLE_SERVICE_ACCOUNT_KEY:', error)
            throw new Error(`Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY: ${error}`)
        }
    } else {
        const fs = require('fs')
        const KEY_FILE_PATH = process.cwd() + '/secrets/google.json'
        credentials = JSON.parse(fs.readFileSync(KEY_FILE_PATH, 'utf8'))
    }

    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: SCOPES,
    })

    return google.drive({ version: 'v3', auth })
}

export async function uploadToGoogleDrive(
    buffer: Buffer,
    filename: string,
    mimeType: string = 'application/pdf',
    folderId?: string
) {
    try {
        const drive = await getDriveClient()
        const targetFolderId = folderId || FOLDER_ID

        const bufferStream = new Stream.PassThrough()
        bufferStream.end(buffer)

        const response = await drive.files.create({
            requestBody: {
                name: filename,
                parents: [folderId || FOLDER_ID],
            },
            media: {
                mimeType,
                body: bufferStream,
            },
            fields: 'id,webViewLink,webContentLink',
            supportsAllDrives: true,
        })

        return {
            fileId: response.data.id,
            url: response.data.webViewLink,
            downloadUrl: response.data.webContentLink
        }
    } catch (error) {
        console.error('❌ Error subiendo a Google Drive:', error)
        throw error
    }
}
