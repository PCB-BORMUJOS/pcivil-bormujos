import React from 'react'
import {
    Document,
    Page,
    Text,
    View,
    Image,
    StyleSheet,
    Font
} from '@react-pdf/renderer'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// Registrar fuentes (Helvetica viene por defecto)
Font.register({
    family: 'Helvetica',
    fonts: [
        { src: 'https://fonts.gstatic.com/s/helvetica/v1/regular.ttf' },
        { src: 'https://fonts.gstatic.com/s/helvetica/v1/bold.ttf', fontWeight: 'bold' }
    ]
})

// Estilos replicando el PDF original
const styles = StyleSheet.create({
    page: {
        padding: '20mm',
        fontSize: 10,
        fontFamily: 'Helvetica',
        lineHeight: 1.3
    },
    header: {
        marginBottom: 15,
        borderBottom: '2pt solid black',
        paddingBottom: 10
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 5
    },
    headerSubtitle: {
        fontSize: 8,
        textAlign: 'center',
        color: '#444'
    },
    section: {
        marginBottom: 10,
        border: '1pt solid black',
        padding: 8
    },
    sectionTitle: {
        fontSize: 9,
        fontWeight: 'bold',
        marginBottom: 5,
        textTransform: 'uppercase'
    },
    row: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 8
    },
    field: {
        flex: 1,
        borderBottom: '0.5pt solid #999',
        paddingBottom: 3
    },
    label: {
        fontSize: 7,
        color: '#666',
        marginBottom: 2,
        textTransform: 'uppercase'
    },
    value: {
        fontSize: 10,
        color: '#000'
    },
    table: {
        marginTop: 5
    },
    tableRow: {
        flexDirection: 'row',
        borderBottom: '0.5pt solid #999',
        paddingVertical: 4
    },
    tableHeader: {
        fontSize: 8,
        fontWeight: 'bold',
        flex: 1,
        textAlign: 'center'
    },
    tableCell: {
        fontSize: 9,
        flex: 1,
        textAlign: 'center'
    },
    checkboxGroup: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 15
    },
    checkbox: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 10
    },
    checkboxBox: {
        width: 10,
        height: 10,
        border: '1pt solid black',
        marginRight: 5
    },
    checkboxBoxChecked: {
        width: 10,
        height: 10,
        border: '1pt solid black',
        backgroundColor: '#000',
        marginRight: 5
    },
    checkboxLabel: {
        fontSize: 9
    },
    signatureContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 15
    },
    signatureBox: {
        width: '30%',
        border: '1pt solid black',
        padding: 5
    },
    signatureLabel: {
        fontSize: 7,
        textTransform: 'uppercase',
        marginBottom: 5,
        textAlign: 'center'
    },
    signatureImage: {
        width: '100%',
        height: 60,
        objectFit: 'contain'
    },
    signatureName: {
        fontSize: 8,
        textAlign: 'center',
        marginTop: 5
    },
    photoContainer: {
        marginBottom: 15
    },
    photo: {
        width: '100%',
        height: 200,
        objectFit: 'contain',
        marginBottom: 10
    }
})

interface PartePDFProps {
    data: any // Tipo del modelo PartePSI de Prisma
}

const PartePDF: React.FC<PartePDFProps> = ({ data }) => {
    // Helper para formatear fecha
    const formatearFecha = (fecha: string | Date) => {
        return format(new Date(fecha), 'dd/MM/yyyy', { locale: es })
    }

    // Helper para verificar si checkbox está marcado
    // Tipologias en DB es Json (string[]).
    const isChecked = (tipologiaId: string) => {
        return Array.isArray(data.tipologias) && data.tipologias.includes(tipologiaId)
    }

    return (
        <Document>
            {/* PÁGINA 1 - DATOS PRINCIPALES */}
            <Page size="A4" style={styles.page}>
                {/* HEADER */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>
                        PARTE DE SERVICIO E INTERVENCIÓN - PSI
                    </Text>
                    <Text style={styles.headerSubtitle}>
                        PROTECCIÓN CIVIL BORMUJOS
                    </Text>
                    <Text style={styles.headerSubtitle}>
                        Servicio de Protección Civil - Ayuntamiento de Bormujos (Sevilla)
                    </Text>
                    <Text style={styles.headerSubtitle}>
                        Calle Maestro Francisco Rodriguez | Avda Universidad de Salamanca
                    </Text>
                    <Text style={styles.headerSubtitle}>
                        info.pcivil@bormujos.net | www.proteccioncivilbormujos.es
                    </Text>
                </View>

                {/* IDENTIFICACIÓN */}
                <View style={styles.section}>
                    <View style={styles.row}>
                        <View style={styles.field}>
                            <Text style={styles.label}>FECHA</Text>
                            <Text style={styles.value}>{formatearFecha(data.fecha)}</Text>
                        </View>
                        <View style={styles.field}>
                            <Text style={styles.label}>Nº INFORME</Text>
                            <Text style={styles.value}>{data.numeroParte}</Text>
                        </View>
                    </View>
                </View>

                {/* PAUTAS DE TIEMPO */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Pautas de Tiempo</Text>
                    <View style={styles.row}>
                        <View style={styles.field}>
                            <Text style={styles.label}>HORA LLAMADA</Text>
                            <Text style={styles.value}>{data.horaLlamada || '-'}</Text>
                        </View>
                        <View style={styles.field}>
                            <Text style={styles.label}>HORA SALIDA</Text>
                            <Text style={styles.value}>{data.horaSalida || '-'}</Text>
                        </View>
                        <View style={styles.field}>
                            <Text style={styles.label}>HORA LLEGADA</Text>
                            <Text style={styles.value}>{data.horaLlegada || '-'}</Text>
                        </View>
                    </View>
                    <View style={styles.row}>
                        <View style={styles.field}>
                            <Text style={styles.label}>HORA TERMINADO</Text>
                            <Text style={styles.value}>{data.horaTerminado || '-'}</Text>
                        </View>
                        <View style={styles.field}>
                            <Text style={styles.label}>HORA DISPONIBLE</Text>
                            <Text style={styles.value}>{data.horaDisponible || '-'}</Text>
                        </View>
                    </View>
                </View>

                {/* DATOS DEL SERVICIO */}
                <View style={styles.section}>
                    <View style={styles.row}>
                        <View style={styles.field}>
                            <Text style={styles.label}>LUGAR</Text>
                            <Text style={styles.value}>{data.lugar}</Text>
                        </View>
                    </View>
                    <View style={styles.row}>
                        <View style={styles.field}>
                            <Text style={styles.label}>MOTIVO</Text>
                            <Text style={styles.value}>{data.motivo || '-'}</Text>
                        </View>
                        <View style={styles.field}>
                            <Text style={styles.label}>ALERTANTE</Text>
                            <Text style={styles.value}>{data.alertante || '-'}</Text>
                        </View>
                    </View>
                </View>

                {/* VEHÍCULOS */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Vehículos</Text>
                    <Text style={styles.value}>
                        {/* TODO: Resolver IDs de vehículos a indicativos/matrículas si es necesario, 
                pero asumo que guardamos IDs o info relevante.
                Si guardamos IDs, deberíamos haber populado esto en el endpoint o aquí.
                El prompt dice "Extraer de tabla Vehiculo". 
                En este componente solo recibimos 'data'. 
                Deberíamos pasar los vehículos resueltos o simplemente mostrarlos. 
                Por ahora JSON.stringify para debug o mostrar IDs. */}
                        {Array.isArray(data.vehiculosIds) ? data.vehiculosIds.join(', ') : JSON.stringify(data.vehiculosIds)}
                    </Text>
                </View>

                {/* EQUIPO Y WALKIES */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Equipo y Walkies</Text>
                    <View style={styles.table}>
                        <View style={styles.tableRow}>
                            <Text style={styles.tableHeader}>EQUIPO</Text>
                            <Text style={styles.tableHeader}>WALKIES</Text>
                        </View>
                        {Array.isArray(data.equipoWalkies) && data.equipoWalkies.map((item: any, index: number) => (
                            <View key={index} style={styles.tableRow}>
                                <Text style={styles.tableCell}>{item.equipo}</Text>
                                <Text style={styles.tableCell}>{item.walkie}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* CIRCULACIÓN */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Circulación</Text>
                    <View style={styles.checkboxGroup}>
                        <View style={styles.checkbox}>
                            <View style={data.circulacion === 'prevencion' ? styles.checkboxBoxChecked : styles.checkboxBox} />
                            <Text style={styles.checkboxLabel}>Prevención</Text>
                        </View>
                        <View style={styles.checkbox}>
                            <View style={data.circulacion === 'intervencion' ? styles.checkboxBoxChecked : styles.checkboxBox} />
                            <Text style={styles.checkboxLabel}>Intervención</Text>
                        </View>
                        <View style={styles.checkbox}>
                            <View style={data.circulacion === 'otros' ? styles.checkboxBoxChecked : styles.checkboxBox} />
                            <Text style={styles.checkboxLabel}>Otros</Text>
                        </View>
                    </View>
                </View>

                {/* TIPOLOGÍAS DE SERVICIO */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Tipología de Servicio</Text>
                    {/* Aquí deberíamos renderizar las tipologías. 
              Como es complejo, por ahora ponemos un placeholder o listamos las seleccionadas.
              El prompt pide checkbox exactos. 
              Para la V1 pondremos una lista de las seleccionadas. */}
                    <View style={styles.checkboxGroup}>
                        {Array.isArray(data.tipologias) && data.tipologias.map((t: string) => (
                            <View key={t} style={styles.checkbox}>
                                <View style={styles.checkboxBoxChecked} />
                                <Text style={styles.checkboxLabel}>{t}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* OBSERVACIONES */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Observaciones</Text>
                    <Text style={styles.value}>{data.observaciones}</Text>
                </View>

                {/* FIRMAS */}
                <View style={styles.signatureContainer}>
                    <View style={styles.signatureBox}>
                        <Text style={styles.signatureLabel}>Indicativo que Cumplimenta</Text>
                        {data.firmaIndicativoCumplimenta && (
                            <Image
                                src={data.firmaIndicativoCumplimenta}
                                style={styles.signatureImage}
                            />
                        )}
                        <Text style={styles.signatureName}>{data.indicativoCumplimenta}</Text>
                    </View>

                    <View style={styles.signatureBox}>
                        <Text style={styles.signatureLabel}>Responsable del Turno</Text>
                        {data.firmaResponsableTurno && (
                            <Image
                                src={data.firmaResponsableTurno}
                                style={styles.signatureImage}
                            />
                        )}
                        <Text style={styles.signatureName}>{data.responsableTurno}</Text>
                    </View>

                    <View style={styles.signatureBox}>
                        <Text style={styles.signatureLabel}>VB Jefe de Servicio</Text>
                        {data.firmaJefeServicio && (
                            <Image
                                src={data.firmaJefeServicio}
                                style={styles.signatureImage}
                            />
                        )}
                        <Text style={styles.signatureName}>J-44</Text>
                    </View>
                </View>
            </Page>

            {/* PÁGINA 2 - DESARROLLO DETALLADO */}
            <Page size="A4" style={styles.page}>
                {/* HEADER IDÉNTICO */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>
                        PARTE DE SERVICIO E INTERVENCIÓN - PSI
                    </Text>
                    <Text style={styles.headerSubtitle}>
                        PROTECCIÓN CIVIL BORMUJOS
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Desarrollo Detallado del Servicio</Text>
                    <Text style={styles.value}>{data.desarrolloDetallado}</Text>
                </View>
            </Page>

            {/* PÁGINA 3 - FOTOGRAFÍAS */}
            <Page size="A4" style={styles.page}>
                {/* HEADER IDÉNTICO */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>
                        PARTE DE SERVICIO E INTERVENCIÓN - PSI
                    </Text>
                    <Text style={styles.headerSubtitle}>
                        PROTECCIÓN CIVIL BORMUJOS
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Fotografías</Text>
                    {Array.isArray(data.fotosUrls) && data.fotosUrls.length > 0 ? (
                        data.fotosUrls.map((url: string, index: number) => (
                            <View key={index} style={styles.photoContainer}>
                                <Image src={url} style={styles.photo} />
                            </View>
                        ))
                    ) : (
                        <Text style={styles.value}>No se adjuntaron fotografías</Text>
                    )}
                </View>
            </Page>
        </Document>
    )
}

export default PartePDF
