import {injectable, /* inject, */ BindingScope} from '@loopback/core';
import {Credenciales, FactorDeAutenticacionPorCodigo, Login, Usuario} from '../models';
import {repository} from '@loopback/repository';
import {LoginRepository, UsuarioRepository} from '../repositories';
import {ConfiguracionSeguridad} from '../config/seguridad.config';
import {HttpErrors} from '@loopback/rest';
const generator = require('generate-password');//paquete para generar claves aleatorias https://www.npmjs.com/package/generate-password   "npm i generate-password"
const MD5 = require("crypto-js/md5");//paquete para encriptar claves https://www.npmjs.com/package/crypto-js  "npm i crypto-js"
const jwt = require('jsonwebtoken');//paquete para generar token https://www.npmjs.com/package/jsonwebtoken  "npm i jsonwebtoken"

@injectable({scope: BindingScope.TRANSIENT})
export class SeguridadService {

  constructor(
    //inyeccion para poder utilizar el repositorio de usuario para poder hacer consultas a la base de datos
    @repository(UsuarioRepository)
    public usuarioRepository: UsuarioRepository,

    //inyeccion para poder utilizar el repositorio de login para poder hacer consultas a la base de datos
    @repository(LoginRepository)
    public loginRepository: LoginRepository,


    ){}

  /*
   * Add service methods here
   */


  /**
   * Metodo para generar una clave aleatoria
   * @returns string
   */
  //Metodo para generar una texto aleatoria utilizando el paquete de npm "npm i generate-password"
  crearTextoAleatoria(numerocaracteres: number): string {
    let password = generator.generate({
      length: numerocaracteres,
      numbers: true
    });
    return password;
  }

  /**
   * Metodo para encriptar una clave
   * @param clave
   * @returns string
   */
  //Metodo para encriptar una clave usando MD5 "npm i crypto-js"
  encriptartexto(texto: string): string {
    let cadenacifrada=MD5(texto).toString();
    return cadenacifrada;
  }

/**
 *
 * @param credenciales
 * @returns Usuario|null
 */
//Metodo para identificar un usuario por medio de su correo y su clave
async identificarusuario(credenciales:Credenciales): Promise< Usuario|null> {
  let usuario=await this.usuarioRepository.findOne({
    where:{
      correo:credenciales.correo,
      clave:credenciales.clave,
      estadoValidacion:true

    }
  });
  //console.log(usuario);
  return usuario as Usuario;
  }


/**
 * valida el codifo 2fa
 * @param credenciales2fa credenciales del usuario con el codigo del 2fa
 * @returns registro login o null
 */
//Metodo para validar el codigo 2fa
async validarCoddigo2fa(credenciales2fa: FactorDeAutenticacionPorCodigo): Promise<Usuario|null> {
  let login=await this.loginRepository.findOne({
    where:{
      usuarioId:credenciales2fa.usuarioId,
      codigo_2fa:credenciales2fa.codigo2fa,
      estado_codigo2fa:false
    }
  });
  if(login){
    let usuario= await this.usuarioRepository.findById(login.usuarioId);
    return usuario;
  }
  return null;
  }



  /**
   * Metodo para crear un token
   * @param usuario
   * @returns retorna un token con los datos del usuario
   */
  //Metodo para crear token
  CrearToken(usuario:Usuario):string{
    //ACA ME QUEDE CONTINUAR CON EL VIDEO  MINUTO: 17:22
    let datos = {
      nombre: usuario.nombre,
      rol: usuario.rolId,
      correo: usuario.correo,
      //idPostgres: usuario.idPostgres,
      numDocumento: usuario.num_documento,
      edad: usuario.edad,

    }
    let token = jwt.sign(datos, ConfiguracionSeguridad.claveJWT, { expiresIn: '12h' });
    return token;
  }



  /**
   * Metodo para verificar y obtener el rol de un token
   * @param token
   * @returns el _id del rol
   */
  async obtenerRolDesdeToken(token:string): Promise<string> {
    try {
      let datos = jwt.verify(token, ConfiguracionSeguridad.claveJWT);
      //valida el estado del token que esta en la base de datos
      let estado_tokendb = await this.validarEstadoToken(token);
      //console.log(estado_tokendb);
      if(datos && estado_tokendb){
        return datos.rol;
      } else {
        throw new HttpErrors.Unauthorized("El token es invalido");
      }
    } catch (err) {
      //lanzar un error de token invalido
      throw new HttpErrors.Unauthorized("El token es invalido");
    }
  }

  //funcion que valida si el estado del token es true
  async validarEstadoToken(token:string):Promise<boolean>{
    let estado_tokendb= await this.loginRepository.findOne({
      where:{
        token:token,
        estado_token:true
      }
    });
    if(estado_tokendb){
      return true;
    }
    return false;
  }

  /**
   * Metodo para obtener el usuario desde el token
   * @param token
   * @returns el _id del usuario
   */
  async obtenerUsuarioDesdeToken(token:string): Promise<string> {
    try {
      let datos = jwt.verify(token, ConfiguracionSeguridad.claveJWT);
      //console.log("datos desde obtenerUsuarioDesdeToken");
      //console.log(datos);
      let estado_tokendb = await this.validarEstadoToken(token);

      if(datos && estado_tokendb){
        //console.log("TODO BIEN, DATOS.IDPOSTGRES");
        //console.log(datos.idPostgres);
        return datos.idPostgres;
      } else {
        throw new HttpErrors.Unauthorized("El token es invalido");
      }
    } catch (err) {
      //lanzar un error de token invalido
      throw new HttpErrors.Unauthorized("El token es invalido");
    }
  }










}
