import React, { useState, useEffect, useRef } from 'react';
import { addDays, addMonths, isWeekend, format } from 'date-fns';
import './App.css';

const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
const SPREADSHEET_ID = process.env.REACT_APP_SPREADSHEET_ID;
const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

function subtractWeekdays(date, days) {
    let current = new Date(date);
    while (days > 0) {
        current = addDays(current, -1);
        if (!isWeekend(current)) {
            days--;
        }
    }
    return current;
}

function addWeekdays(date, days) {
    let current = new Date(date);
    while (days > 0) {
        current = addDays(current, 1);
        if (!isWeekend(current)) {
            days--;
        }
    }
    return current;
}

function App() {
    const [electionDate, setElectionDate] = useState(null);
    const [communicationFromDate, setCommunicationFromDate] = useState(null);
    const [communicationToDate, setCommunicationToDate] = useState(null);
    const [publicationDate, setPublicationDate] = useState(null);
    const [claimFrom, setClaimFrom] = useState(null);
    const [claimTo, setClaimTo] = useState(null);
    const [selectedDepositDate, setSelectedDepositDate] = useState(null);
    const [depositOptions, setDepositOptions] = useState([]);
    const [certificadoFromDate, setCertificadoFromDate] = useState(null);
    const [certificadoToDate, setCertificadoToDate] = useState(null);
    const [antecedentesToDate, setAntecedentesToDate] = useState(null);
    const resultsRef = useRef(null)
    const depositRef = useRef(null);
    const [isSignedIn, setIsSignedIn] = useState(false);

    useEffect(() => {
        if (electionDate && resultsRef.current) {
            resultsRef.current.scrollIntoView({ behavior: 'smooth' });
        }
        if (electionDate) {
            const election = new Date(electionDate);

            // Comunicación
            setCommunicationFromDate(format(addDays(addMonths(election, -2), 1), 'dd/MM/yyyy'));
            setCommunicationToDate(format(subtractWeekdays(election, 15), 'dd/MM/yyyy'));

            // Publicación
            setPublicationDate(format(subtractWeekdays(election, 14), 'dd/MM/yyyy'));

            // Reclamo
            setClaimFrom(format(addWeekdays(election, 2), 'dd/MM/yyyy'));

            setClaimTo(format(addWeekdays(election, 15), 'dd/MM/yyyy'));

            // Depósito
            let depositDay = addDays(election, 2);
            const options = [];
            for (let i = 0; i < 5; i++) {
                while (isWeekend(depositDay)) {
                    depositDay = addDays(depositDay, 1);
                }
                options.push(format(depositDay, 'dd/MM/yyyy'));
                depositDay = addDays(depositDay, 1);
            }
            setDepositOptions(options);
        }
    }, [electionDate]);

    function parseDateFromString(dateString) {
        const [day, month, year] = dateString.split("/");
        return new Date(year, month - 1, day); // Los meses en JavaScript van de 0-11
    }

    useEffect(() => {
        if (selectedDepositDate) {
            const depositDate = parseDateFromString(selectedDepositDate);

            if (!isNaN(depositDate)) {
                // Certificado Desde (un día hábil después del día de depósito)
                let certificadoFrom = addWeekdays(depositDate, 1);
                if (!isNaN(certificadoFrom)) {
                    setCertificadoFromDate(format(certificadoFrom, 'dd/MM/yyyy'));
                } else {
                    setCertificadoFromDate(null);
                }

                // Certificado Hasta (30 días corridos después de certificadoFrom)
                let certificadoTo = addDays(certificadoFrom, 30);
                if (!isNaN(certificadoTo)) {
                    setCertificadoToDate(format(certificadoTo, 'dd/MM/yyyy'));
                } else {
                    setCertificadoToDate(null);
                }

                // Antecedentes (20 días después del día de depósito)
                let antecedentesTo = addDays(depositDate, 20);
                if (!isNaN(antecedentesTo)) {
                    setAntecedentesToDate(format(antecedentesTo, 'dd/MM/yyyy'));
                } else {
                    setAntecedentesToDate(null);
                }
            }
        }
    }, [selectedDepositDate]);

    useEffect(() => {
        if (selectedDepositDate && depositRef.current) {
            depositRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [selectedDepositDate]);

    //From here, Google Api
    useEffect(() => {
        // Load the gapi script
        const gapiScript = document.createElement('script');
        gapiScript.src = 'https://apis.google.com/js/api.js';
        gapiScript.onload = () => {
            window.gapi.load('client', initializeGapiClient);
        };
        document.body.appendChild(gapiScript);

        // Load the gis script
        const gisScript = document.createElement('script');
        gisScript.src = 'https://accounts.google.com/gsi/client';
        gisScript.onload = () => {
            window.google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: (response) => {
                    if (response.error !== undefined) {
                        throw response;
                    }
                    setIsSignedIn(true);
                },
            });
        };
        document.body.appendChild(gisScript);

        // Clean-up function
        return () => {
            document.body.removeChild(gapiScript);
            document.body.removeChild(gisScript);
        };
    }, []);
    async function initializeGapiClient() {
        await window.gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: [DISCOVERY_DOC],
        });
    }
    const handleAuthClick = () => {
        window.google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (response) => {
                if (response.error !== undefined) {
                    throw response;
                }
                setIsSignedIn(true);
            },
        }).requestAccessToken({ prompt: 'consent' });
    };
    const handleSignoutClick = () => {
        const token = window.gapi.client.getToken();
        if (token !== null) {
            window.google.accounts.oauth2.revoke(token.access_token);
            window.gapi.client.setToken('');
            setIsSignedIn(false);
        }
    };
    async function writeToSheet() {
        try {
            const rangeResponse = await window.gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: 'Sheet1',
            });
            const lastRow = rangeResponse.result.values ? rangeResponse.result.values.length : 0;

            const writeResponse = await window.gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: `Sheet1!A${lastRow + 1}`,
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: [['Hola']],
                },
            });

            if (writeResponse.status === 200) {
                alert('Write successful');
            } else {
                alert(`Error writing to Sheet: ${writeResponse.result.error.message}`);
            }
        } catch (err) {
            console.error('Error writing to Sheet: ', err);
            alert(`Error writing to Sheet: ${err.result.error.message}`);
        }
    }


    return (
        <div className="App">
            <img src="background.jpg" alt="Banner" className="banner" />
            <h1>Simulador de fechas para elecciones</h1>
            {!isSignedIn && (
                <button onClick={handleAuthClick}>
                    Authorize
                </button>
            )}

            <div className="election-date">
                <label>Fecha de Elección:</label>
                <div>
                    <input type="date" onChange={(e) => setElectionDate(e.target.value)} />
                    <button onClick={() => console.log('Calcular fechas')}>Calcular</button>
                </div>
            </div>

            {electionDate && (
                <>
                    <h2>Fecha de Comunicación</h2>
                    <div className="date-container">
                        <div >
                            <div className="date-box">Desde: <strong>{communicationFromDate}</strong></div>
                            <div>Desde el establecimiento de la Comisión Electoral (2 meses antes de la elección).</div>
                        </div>
                        <div >
                            <div className="date-box">Hasta: <strong>{communicationToDate}</strong></div>
                            <div>Se debe comunicar en Secretaría Municipal al menos 15 días hábiles antes de la elección.</div>
                        </div>
                    </div>

                    <h2>Fecha de Publicación</h2>
                    <div >
                        <div className="date-box">Día hábil siguiente: <strong>{publicationDate}</strong></div>
                        <div>En la página web institucional, al día siguiente hábil de la comunicación.</div>
                    </div>

                    <h2 className='TER'>Plazo para reclamar ante el TER</h2>
                    <span className='TERspan'>Tribunal Electoral Regional</span>
                    <div className="date-container TERcont">
                        <div>
                            <div className="date-box">Desde: <strong>{claimFrom}</strong></div>
                            <div>A partir del día hábil siguiente a la elección (hábil judicial, es decir, de lunes a sábado).</div>
                        </div>
                        <div>
                            <div className="date-box">Hasta: <strong>{claimTo}</strong></div>
                            <div>Hasta el día 15 (hábil judicial, es decir, de lunes a sábado).</div>
                        </div>
                    </div>

                    <h2 ref={resultsRef}>Depósito de Documento de Elección</h2>
                    <label>Selecione fecha: </label>
                    <div>
                        <select className="selectContainer" onChange={(e) => setSelectedDepositDate(e.target.value)}>
                            {depositOptions.map((date, index) => (
                                <option key={index} value={date}>{date}</option>
                            ))}
                        </select>
                        <div>
                            Dentro de los 5 días hábiles siguientes a la elección, la Comisión Electoral debe realizar el depósito en Secretaría Municipal.
                        </div>
                    </div>

                    {selectedDepositDate && (
                        <>
                            <h2>Certificado de vigencia provisorio</h2>
                            <div className="date-container">
                                <div>
                                    <div className="date-box">Desde: <strong>{certificadoFromDate}</strong></div>
                                    <div>Se puede solicitar una vez verificado el depósito.</div>
                                </div>
                                <div>
                                    <div className="date-box">Hasta: <strong>{certificadoToDate}</strong></div>
                                    <div>Con vigencia de 30 días corridos, renovables en caso de existir reclamo.</div>
                                </div>
                            </div>

                            <h2 ref={depositRef}>Envío de antedecentes al registro civil:</h2>
                            <div>
                                <div className="date-box"><strong>{antecedentesToDate}</strong></div>
                                <div>
                                    Este trámite lo debe realizar el Secretario Municipal trascurridos 20 días desde el depósito de los documentos. Si hubiere reclamo, se suspende hasta su fallo.
                                </div>
                            </div>
                            {isSignedIn && (
                                <button onClick={writeToSheet}>
                                    Write "Hola" to Sheet
                                </button>
                            )}
                        </>
                    )}
                </>
            )}
        </div>
    );
}

export default App;