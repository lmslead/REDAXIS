import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const run = async () => {
  const config = {
    user: process.env.ESSL_DB_USER,
    password: process.env.ESSL_DB_PASSWORD || '',
    server: process.env.ESSL_DB_SERVER,
    database: process.env.ESSL_DB_NAME,
    port: Number(process.env.ESSL_DB_PORT || 1433),
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
  };

  try {
    await sql.connect(config);
    const result = await sql.query(`SELECT TOP 20 Emp_Code, Log_Date, Log_Time, Direction, Device_Id FROM ${process.env.ESSL_DB_TABLE || 'HRMS'} ORDER BY Log_Date DESC, Log_Time DESC`);
    console.log(result.recordset);
  } catch (error) {
    console.error('Error fetching ESSL logs:', error);
  } finally {
    await sql.close();
  }
};

run();
