"use client";
import 'aframe'
import * as React from 'react'
import * as THREE from 'three'
import Controller from '../controller.js'

import { connectMQTT, mqttclient,idtopic,subscribeMQTT, publishMQTT } from '../../lib/MetaworkMQTT'

//const MQTT_REQUEST_TOPIC = "mgr/request";
const MQTT_DEVICE_TOPIC = "dev/"+idtopic;
const MQTT_CTRL_TOPIC =        "control/"+idtopic; // 自分のIDに制御を送信
//const MQTT_ROBOT_STATE_TOPIC = "robot/";
let publish = true //VRモードに移行するまではMQTTをpublishしない（かつ、ロボット情報を取得するまで）
//let receive_state = false // ロボットの状態を受信してるかのフラグ
let receive_state = true // ロボットの状態を受信してるかのフラグ

const joint_pos = {
  base:{x:0,y:0,z:0},
  j1:{x:0,y:0,z:0},
  j2:{x:0,y:0.21,z:0},
  j3:{x:0,y:0.51,z:0},
  j4:{x:-0.03,y:0.39,z:0},
  j5:{x:0,y:0,z:0},
  j6:{x:0.15,y:0,z:0},
  j7:{x:0,y:0,z:0.16},
}

let registered = false
const order = 'ZYX'

export default function Home() {
  const [tick, setTick] = React.useState(0)
  const [now, setNow] = React.useState(new Date())
  const [rendered,set_rendered] = React.useState(false)
  const robotNameList = ["Model"]
  const [robotName,set_robotName] = React.useState(robotNameList[0])
  const [cursor_vis,set_cursor_vis] = React.useState(false)
  const [box_vis,set_box_vis] = React.useState(false)
  const [target_error,set_target_error] = React.useState(false)

  const [j1_rotate,set_j1_rotate] = React.useState(0)
  const [j2_rotate,set_j2_rotate] = React.useState(0)
  const [j3_rotate,set_j3_rotate] = React.useState(0)
  const [j4_rotate,set_j4_rotate] = React.useState(0)
  const [j5_rotate,set_j5_rotate] = React.useState(0)
  const [j6_rotate,set_j6_rotate] = React.useState(0)
  const [j7_rotate,set_j7_rotate] = React.useState(0) //指用

  const [rotate, set_rotate] = React.useState([0,0,0,0,0,0,0])  //出力用
  const [input_rotate, set_input_rotate] = React.useState([0,0,0,0,0,0,0])  //入力用

  const [j1_object,set_j1_object] = React.useState()
  const [j2_object,set_j2_object] = React.useState()
  const [j3_object,set_j3_object] = React.useState()
  const [j4_object,set_j4_object] = React.useState()
  const [j5_object,set_j5_object] = React.useState()
  const [j6_object,set_j6_object] = React.useState()

  const [p11_object,set_p11_object] = React.useState()
  const [p12_object,set_p12_object] = React.useState()
  const [p13_object,set_p13_object] = React.useState()
  const [p14_object,set_p14_object] = React.useState()
  const [p15_object,set_p15_object] = React.useState()
  const [p16_object,set_p16_object] = React.useState()
  const [p20_object,set_p20_object] = React.useState()
  const [p21_object,set_p21_object] = React.useState()
  const [p22_object,set_p22_object] = React.useState()
  const [p51_object,set_p51_object] = React.useState()

  const [p15_pos,set_p15_pos] = React.useState({x:0,y:0,z:0})
  const [p16_pos,set_p16_pos] = React.useState({x:0,y:0,z:0})

  const [controller_object,set_controller_object] = React.useState(new THREE.Object3D())
  const [trigger_on,set_trigger_on] = React.useState(false)
  const [start_pos,set_start_pos] = React.useState(new THREE.Vector3())
  const [save_target,set_save_target] = React.useState()
  const [vr_mode,set_vr_mode] = React.useState(false)
//  const vrModeRef = React.useRef(false); // vr_mode はref のほうが使いやすい
  const robotIDRef = React.useRef("none");

  const [test_pos,set_test_pos] = React.useState({x:0,y:0,z:0})

  const [c_pos_x,set_c_pos_x] = React.useState(0)
  const [c_pos_y,set_c_pos_y] = React.useState(0.35)
  const [c_pos_z,set_c_pos_z] = React.useState(-1.2)
  const [c_deg_x,set_c_deg_x] = React.useState(0)
  const [c_deg_y,set_c_deg_y] = React.useState(180)
  const [c_deg_z,set_c_deg_z] = React.useState(0)

  const [wrist_rot_x,set_wrist_rot_x] = React.useState(180)
  const [wrist_rot_y,set_wrist_rot_y] = React.useState(0)
  const [wrist_rot_z,set_wrist_rot_z] = React.useState(0)
  const [tool_rotate,set_tool_rotate] = React.useState(0)
  const [wrist_degree,set_wrist_degree] = React.useState({direction:0,angle:0})
  const [dsp_message,set_dsp_message] = React.useState("")

  const toolNameList = ["No tool"]
  const [toolName,set_toolName] = React.useState(toolNameList[0])

  const [x_vec_base,set_x_vec_base] = React.useState()
  const [y_vec_base,set_y_vec_base] = React.useState()
  const [z_vec_base,set_z_vec_base] = React.useState()

  const [target,set_target] = React.useState({x:0.3,y:0.5,z:-0.5})
  const [p15_16_len,set_p15_16_len] = React.useState(joint_pos.j7.z)
  const [p14_maxlen,set_p14_maxlen] = React.useState(0)
 
  React.useEffect(() => {
    if(rendered && vr_mode && trigger_on){
      const move_pos = pos_sub(start_pos,controller_object.position)
      move_pos.x = move_pos.x/5
      move_pos.y = move_pos.y/5
      move_pos.z = move_pos.z/5
      let target_pos
      if(save_target === undefined){
        set_save_target(target)
        target_pos = pos_sub(target,move_pos)
      }else{
        target_pos = pos_sub(save_target,move_pos)
      }
      if(target_pos.y < 0.012){
        target_pos.y = 0.012
      }
      set_target((target_pos))
    }
  },[controller_object.position.x,controller_object.position.y,controller_object.position.z])

  React.useEffect(() => {
    if(rendered && vr_mode && trigger_on){
      const wk_mtx = new THREE.Matrix4().makeRotationFromEuler(controller_object.rotation)
      .multiply(
        new THREE.Matrix4().makeRotationFromEuler(
          new THREE.Euler(
            (0.6654549523360951*-1),  //x
            toRadian(180),  //y
            toRadian(180),  //z
            controller_object.rotation.order
          )
        )
      )
      const wk_euler = new THREE.Euler().setFromRotationMatrix(wk_mtx,controller_object.rotation.order)
      set_wrist_rot_x(round(toAngle(wk_euler.x)))
      set_wrist_rot_y(round(toAngle(wk_euler.y)))
      set_wrist_rot_z(round(toAngle(wk_euler.z)))
    }
  },[controller_object.rotation.x,controller_object.rotation.y,controller_object.rotation.z])

  React.useEffect(function() {
    const intervalId = setInterval(function() {
      setNow(new Date());
    }, 10);
    return function(){clearInterval(intervalId)};
  }, [now]);

  React.useEffect(() => {
    if(rendered){
      target_update()
    }
  },[rendered])

  const robotChange = ()=>{
    const get = (robotName)=>{
      let changeIdx = robotNameList.findIndex((e)=>e===robotName) + 1
      if(changeIdx >= robotNameList.length){
        changeIdx = 0
      }
      return robotNameList[changeIdx]
    }
    set_robotName(get)
  }

  React.useEffect(() => {
    if (j1_object !== undefined) {
      j1_object.quaternion.setFromAxisAngle(y_vec_base,toRadian(j1_rotate))
      set_rotate((org)=>{
        org[0] = round(j1_rotate,3)
        return org
      })
    }
  }, [j1_rotate])

  React.useEffect(() => {
    if (j2_object !== undefined) {
      j2_object.quaternion.setFromAxisAngle(x_vec_base,toRadian(j2_rotate))
      set_rotate((org)=>{
        org[1] = round(j2_rotate,3)
        return org
      })
    }
  }, [j2_rotate])

  React.useEffect(() => {
    if (j3_object !== undefined) {
      j3_object.quaternion.setFromAxisAngle(x_vec_base,toRadian(j3_rotate))
      set_rotate((org)=>{
        org[2] = round(j3_rotate,3)
        return org
      })
    }
  }, [j3_rotate])

  React.useEffect(() => {
    if (j4_object !== undefined) {
      j4_object.quaternion.setFromAxisAngle(y_vec_base,toRadian(j4_rotate))
      set_rotate((org)=>{
        org[3] = round(j4_rotate,3)
        return org
      })
    }
  }, [j4_rotate])

  React.useEffect(() => {
    if (j5_object !== undefined) {
      j5_object.quaternion.setFromAxisAngle(x_vec_base,toRadian(j5_rotate))
      set_rotate((org)=>{
        org[4] = round(normalize180(j5_rotate+90),3)
        return org
      })
    }
  }, [j5_rotate])

  React.useEffect(() => {
    if (j6_object !== undefined) {
      j6_object.quaternion.setFromAxisAngle(z_vec_base,toRadian(j6_rotate))
      set_rotate((org)=>{
        org[5] = round(j6_rotate,3)
        return org
      })
    }
  }, [j6_rotate])

  React.useEffect(() => {
    set_rotate((org)=>{
      org[6] = round(j7_rotate,3)
      return org
    })
  }, [j7_rotate])

  React.useEffect(() => {
    if (j1_object !== undefined) {
      const rotate_value = round(normalize180(input_rotate[0]))
      set_j1_rotate(rotate_value)
    }
  }, [input_rotate[0]])

  React.useEffect(() => {
    if (j2_object !== undefined) {
      const rotate_value = round(normalize180(input_rotate[1]))
      set_j2_rotate(rotate_value)
    }
  }, [input_rotate[1]])

  React.useEffect(() => {
    if (j3_object !== undefined) {
      const rotate_value = round(normalize180(input_rotate[2]))
      set_j3_rotate(rotate_value)
    }
  }, [input_rotate[2]])

  React.useEffect(() => {
    if (j4_object !== undefined) {
      const rotate_value = round(normalize180(input_rotate[3]))
      set_j4_rotate(rotate_value)
    }
  }, [input_rotate[3]])

  React.useEffect(() => {
    if (j5_object !== undefined) {
      const rotate_value = round(normalize180(input_rotate[4]-90))
      set_j5_rotate(rotate_value)
    }
  }, [input_rotate[4]])

  React.useEffect(() => {
    if (j6_object !== undefined) {
      const rotate_value = round(normalize180(input_rotate[5]))
      set_j6_rotate(rotate_value)
    }
  }, [input_rotate[5]])

  React.useEffect(() => {
    if(rendered){
      const rotate_value = input_rotate[6]
      set_j7_rotate(rotate_value)
    }
  }, [input_rotate[6]])

  const get_j5_quaternion = (rot_x=wrist_rot_x,rot_y=wrist_rot_y,rot_z=wrist_rot_z)=>{
    return new THREE.Quaternion().setFromEuler(
      new THREE.Euler(toRadian(rot_x), toRadian(rot_y), toRadian(rot_z), order)
    )
  }

  const get_p21_pos = ()=>{
    const j5q = get_j5_quaternion()
    const p21_pos = quaternionToRotation(j5q,{x:0,y:0,z:p15_16_len})
    return p21_pos
  }

  React.useEffect(() => {
    if(rendered){
      target_update()

      if(p51_object)p51_object.quaternion.copy(get_j5_quaternion())
  
    }
  },[wrist_rot_x,wrist_rot_y,wrist_rot_z])

// MetaworkMQTT protocol
  // register to MQTT
  React.useEffect(() => {
    if (typeof window.mqttClient === 'undefined') {
      //サブスクライブするトピックの登録
      window.mqttClient = connectMQTT();
      subscribeMQTT([
        MQTT_DEVICE_TOPIC
      ]);
      //        MQTT_CTRL_TOPIC  // MQTT Version5 なので、 noLocal が効くはず

      //サブスクライブ時の処理
      window.mqttClient.on('message', (topic, message) => {
        if (topic == MQTT_DEVICE_TOPIC){ // デバイスへの連絡用トピック
          console.log(" MQTT Device Topic: ", message.toString());
            // ここでは Viewer の設定を実施！
          let data = JSON.parse(message.toString())
          if (data.controller != undefined) {// コントローラ情報ならば！
            robotIDRef.current = data.devId
            subscribeMQTT([
              "control/"+data.devId
            ]);
          }
        }else if (topic == "control/"+robotIDRef.current){
          let data = JSON.parse(message.toString())
          if (data.joints != undefined) {
            set_input_rotate(data.joints)
          }
        }
      })
    }
    // 消える前にイベントを呼びたい
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [])

  const handleBeforeUnload = () => {
    if (mqttclient != undefined) {
      publishMQTT("mgr/unregister", JSON.stringify({ devId: idtopic }));
    }
  }


  const quaternionToRotation = (q,v)=>{
    const q_original = new THREE.Quaternion(q.x, q.y, q.z, q.w)
    const q_conjugate = new THREE.Quaternion(q.x, q.y, q.z, q.w).conjugate()
    const q_vector = new THREE.Quaternion(v.x, v.y, v.z, 0)
    const result = q_original.multiply(q_vector).multiply(q_conjugate)
    return new THREE.Vector3((result.x),(result.y),(result.z))
  }

  const quaternionToAngle = (q)=>{
    const wk_angle = 2 * Math.acos(round(q.w))
    if(wk_angle === 0){
      return {angle:(toAngle(wk_angle)),axis:new THREE.Vector3(0,0,0)}
    }
    const angle = (toAngle(wk_angle))
    const sinHalfAngle = Math.sqrt(1 - q.w * q.w)
    if (sinHalfAngle > 0) {
      const axisX = (q.x / sinHalfAngle)
      const axisY = (q.y / sinHalfAngle)
      const axisZ = (q.z / sinHalfAngle)
      return {angle,axis:new THREE.Vector3(axisX,axisY,axisZ)}
    }else{
      return {angle,axis:new THREE.Vector3(0,0,0)}
    }
  }

  const quaternionDifference = (q1,q2)=>{
    return new THREE.Quaternion(q1.x, q1.y, q1.z, q1.w).invert().multiply(
      new THREE.Quaternion(q2.x, q2.y, q2.z, q2.w)
    )
  }

  const direction_angle = (vec)=>{
    const dir_sign1 = vec.x < 0 ? -1 : 1
    const xz_vector = new THREE.Vector3(vec.x,0,vec.z).normalize()
    const direction = (toAngle(Math.acos(xz_vector.dot(z_vec_base))))*dir_sign1
    const y_vector = new THREE.Vector3(vec.x,vec.y,vec.z).normalize()
    const angle = (toAngle(Math.acos(y_vector.dot(y_vec_base))))
    return {direction,angle}
  }

  const pos_add = (pos1, pos2)=>{
    return {x:(pos1.x + pos2.x), y:(pos1.y + pos2.y), z:(pos1.z + pos2.z)}
  }

  const pos_sub = (pos1, pos2)=>{
    return {x:(pos1.x - pos2.x), y:(pos1.y - pos2.y), z:(pos1.z - pos2.z)}
  }

  const degree3 = (side_a, side_b, side_c)=>{
    const angle_A = (toAngle(Math.acos((side_b ** 2 + side_c ** 2 - side_a ** 2) / (2 * side_b * side_c))))
    const angle_B = (toAngle(Math.acos((side_a ** 2 + side_c ** 2 - side_b ** 2) / (2 * side_a * side_c))))
    const angle_C = (toAngle(Math.acos((side_a ** 2 + side_b ** 2 - side_c ** 2) / (2 * side_a * side_b))))
    return {angle_A,angle_B,angle_C}
  }

  React.useEffect(() => {
    if(rendered){
      target_update()
    }
  },[target,tool_rotate])

  const target_update = ()=>{
    const p21_pos = get_p21_pos()
    const {direction,angle} = direction_angle(p21_pos)
    if(isNaN(direction)){
      console.log("p21_pos 指定可能範囲外！")
      set_dsp_message("p21_pos 指定可能範囲外！")
      return
    }
    if(isNaN(angle)){
      console.log("p21_pos 指定可能範囲外！")
      set_dsp_message("p21_pos 指定可能範囲外！")
      return
    }
    set_wrist_degree({direction,angle})

    target15_update(direction,angle)
  }

  const target15_update = (wrist_direction,wrist_angle)=>{
    let dsp_message = ""
    const shift_target = {...target}
    let result_rotate = {j1_rotate,j2_rotate,j3_rotate,j4_rotate,j5_rotate,j6_rotate,dsp_message}
    let save_distance = undefined
    let save_distance_cnt = 0
    let save_rotate = {...result_rotate}

    for(let i=0; i<10; i=i+1){
      set_test_pos({...shift_target})
      result_rotate = get_all_rotate(shift_target,wrist_direction,wrist_angle)
      if(result_rotate.dsp_message){
        dsp_message = result_rotate.dsp_message
        console.log(dsp_message)
        set_target_error(true)
      }

      const base_m4 = new THREE.Matrix4().multiply(
        new THREE.Matrix4().makeRotationY(toRadian(result_rotate.j1_rotate)).setPosition(joint_pos.j1.x,joint_pos.j1.y,joint_pos.j1.z)
      ).multiply(
        new THREE.Matrix4().makeRotationX(toRadian(result_rotate.j2_rotate)).setPosition(joint_pos.j2.x,joint_pos.j2.y,joint_pos.j2.z)
      ).multiply(
        new THREE.Matrix4().makeRotationX(toRadian(result_rotate.j3_rotate)).setPosition(joint_pos.j3.x,joint_pos.j3.y,joint_pos.j3.z)
      ).multiply(
        new THREE.Matrix4().makeRotationY(toRadian(result_rotate.j4_rotate)).setPosition(joint_pos.j4.x,joint_pos.j4.y,joint_pos.j4.z)
      ).multiply(
        new THREE.Matrix4().makeRotationX(toRadian(result_rotate.j5_rotate)).setPosition(joint_pos.j5.x,joint_pos.j5.y,joint_pos.j5.z)
      ).multiply(
        new THREE.Matrix4().makeRotationZ(toRadian(result_rotate.j6_rotate)).setPosition(joint_pos.j6.x,joint_pos.j6.y,joint_pos.j6.z)
      ).multiply(
        new THREE.Matrix4().setPosition(joint_pos.j7.x,joint_pos.j7.y,joint_pos.j7.z)
      )
      const result_target = new THREE.Vector3().applyMatrix4(base_m4)
      const sabun_pos = pos_sub(target,result_target)
      const sabun_distance = sabun_pos.x**2+sabun_pos.y**2+sabun_pos.z**2
      if(round(sabun_distance) <= 0){
        break
      }
      if(save_distance === undefined){
        save_distance = sabun_distance
      }else{
        if(save_distance < sabun_distance){
          save_distance_cnt = save_distance_cnt + 1
          if(save_distance_cnt > 1){
            if(round(sabun_distance,4) <= 0){
              result_rotate = {...save_rotate}
              console.log("姿勢制御困難！")
              break  
            }
            console.log("姿勢制御不可！")
            set_dsp_message("姿勢制御不可！")
            console.log(`result_target:{x:${result_target.x}, y:${result_target.y}, z:${result_target.z}}`)
            set_target_error(true)
            return
          }
        }
        save_distance = sabun_distance
        save_rotate = {...result_rotate}
      }
      shift_target.x = shift_target.x + sabun_pos.x
      shift_target.y = shift_target.y + sabun_pos.y
      shift_target.z = shift_target.z + sabun_pos.z
    }

    if(dsp_message === ""){
      if(result_rotate.j2_rotate<-150 || result_rotate.j2_rotate>150){
        dsp_message = `j2_rotate 指定可能範囲外！:(${result_rotate.j2_rotate})`
      }
      if(result_rotate.j3_rotate<-150 || result_rotate.j3_rotate>150){
        dsp_message = `j3_rotate 指定可能範囲外！:(${result_rotate.j3_rotate})`
      }
      if((result_rotate.j5_rotate+90)<-150 || (result_rotate.j5_rotate+90)>150){
        dsp_message = `j5_rotate 指定可能範囲外！:(${result_rotate.j5_rotate})`
      }
    }

    if(dsp_message === ""){
      set_target_error(false)
      set_j1_rotate(round(result_rotate.j1_rotate))
      set_j2_rotate(round(result_rotate.j2_rotate))
      set_j3_rotate(round(result_rotate.j3_rotate))
      set_j4_rotate(round(result_rotate.j4_rotate))
      set_j5_rotate(round(result_rotate.j5_rotate))
      set_j6_rotate(normalize180(round(result_rotate.j6_rotate + tool_rotate)))
    }else{
      set_target_error(true)
    }
    set_dsp_message(dsp_message)
  }

  const get_all_rotate = (final_target,wrist_direction,wrist_angle)=>{
    let dsp_message = ""
    const p16_pos = new THREE.Vector3(final_target.x,final_target.y,final_target.z)
    const p15_16_offset_pos = get_p21_pos()
    const p15_pos_wk = pos_sub(p16_pos,p15_16_offset_pos)
    const p15_pos = new THREE.Vector3(p15_pos_wk.x,p15_pos_wk.y,p15_pos_wk.z)

    const syahen_t15 = (distance({x:0,y:joint_pos.j2.y,z:0},p15_pos))
    const takasa_t15 = (p15_pos.y - joint_pos.j2.y)
    const {k:angle_t15} = calc_side_4(syahen_t15,takasa_t15)
    const result_t15 = get_J2_J3_rotate(angle_t15,joint_pos.j3.y,joint_pos.j4.y,syahen_t15)
    if(result_t15.dsp_message){
      dsp_message = result_t15.dsp_message
      return {j1_rotate,j2_rotate,j3_rotate,j4_rotate,j5_rotate,j6_rotate,dsp_message}
    }
    const wk_j2_rotate = result_t15.j2_rotate
    const wk_j3_rotate = result_t15.j3_rotate

    const dir_sign_t15 = p15_pos.x < 0 ? -1 : 1
    const xz_vector_t15 = new THREE.Vector3(p15_pos.x,0,p15_pos.z).normalize()
    const direction_t15 = (toAngle(z_vec_base.angleTo(xz_vector_t15)))
    if(isNaN(direction_t15)){
      dsp_message = "direction_t15 指定可能範囲外！"
      return {j1_rotate,j2_rotate:wk_j2_rotate,j3_rotate:wk_j3_rotate,j4_rotate,j5_rotate,j6_rotate,dsp_message}
    }
    const wk_syahen = distance({x:0,y:0,z:0},{x:p15_pos.x,y:0,z:p15_pos.z})
    const wk_kakudo = calc_side_4(wk_syahen,joint_pos.j4.x).k

    let wk_j1_rotate = normalize180(direction_t15*dir_sign_t15)-(90-wk_kakudo)
    if(isNaN(wk_j1_rotate)){
      dsp_message = "wk_j1_rotate 指定可能範囲外！"
      return {j1_rotate,j2_rotate:wk_j2_rotate,j3_rotate:wk_j3_rotate,j4_rotate,j5_rotate,j6_rotate,dsp_message}
    }

    const baseq = new THREE.Quaternion().multiply(
      new THREE.Quaternion().setFromAxisAngle(y_vec_base,toRadian(wk_j1_rotate))
    ).multiply(
      new THREE.Quaternion().setFromAxisAngle(x_vec_base,toRadian(wk_j2_rotate))
    ).multiply(
      new THREE.Quaternion().setFromAxisAngle(x_vec_base,toRadian(wk_j3_rotate))
    )
    const p14_offset_pos = quaternionToRotation(baseq,{x:0,y:joint_pos.j4.y,z:0})
    const p13_pos = pos_sub(p15_pos,p14_offset_pos)

    const distance_13_16 = (distance(p13_pos,p16_pos))
    const result_angle1 = degree3(joint_pos.j4.y,p15_16_len,distance_13_16)
    if(isNaN(result_angle1.angle_C)){
      dsp_message = "result_angle1.angle_C 指定可能範囲外！"
      return {j1_rotate:wk_j1_rotate,j2_rotate:wk_j2_rotate,j3_rotate:wk_j3_rotate,
        j4_rotate,j5_rotate,j6_rotate,dsp_message}
    }
    const wk_j5_rotate = normalize180((180 - result_angle1.angle_C - 90))

    const result_p16_zero_offset = calc_side_1(p15_16_len,normalize180((180 - result_angle1.angle_C)))
    const p16_zero_offset_pos = quaternionToRotation(baseq,{x:0,y:result_p16_zero_offset.a,z:result_p16_zero_offset.b})
    const p16_zero_pos = pos_add(p15_pos,p16_zero_offset_pos)
    const distance_16_16 = Math.min((distance(p16_zero_pos,p16_pos)),result_p16_zero_offset.b*2)
    const result_angle2 = degree3(result_p16_zero_offset.b,result_p16_zero_offset.b,distance_16_16)
    if(isNaN(result_angle2.angle_C)){
      dsp_message = "result_angle2.angle_C 指定可能範囲外！"
      return {j1_rotate:wk_j1_rotate,j2_rotate:wk_j2_rotate,j3_rotate:wk_j3_rotate,
        j4_rotate,j5_rotate:wk_j5_rotate,j6_rotate,dsp_message}
    }
    const direction_offset = normalize180(wrist_direction - wk_j1_rotate)
    const wk_j4_rotate = normalize180((result_angle2.angle_C * (direction_offset<0?-1:1)))

    baseq.multiply(
      new THREE.Quaternion().setFromAxisAngle(y_vec_base,toRadian(wk_j4_rotate))
    ).multiply(
      new THREE.Quaternion().setFromAxisAngle(x_vec_base,toRadian(wk_j5_rotate))
    )
    const j5q = get_j5_quaternion()
    const p14_j5_diff = quaternionToAngle(quaternionDifference(baseq,j5q))
    const wk_j6_rotate = p14_j5_diff.angle * ((p14_j5_diff.axis.z < 0)?-1:1)

    return {j1_rotate:wk_j1_rotate,j2_rotate:wk_j2_rotate,j3_rotate:wk_j3_rotate,
      j4_rotate:wk_j4_rotate,j5_rotate:wk_j5_rotate,j6_rotate:wk_j6_rotate,dsp_message}
  }

  const get_J2_J3_rotate = (angle_base,side_a,side_b,side_c)=>{
    let dsp_message = undefined
    const max_dis = side_a + side_b
    const min_dis = Math.abs(side_a - side_b)

    let wk_j2_rotate = 0
    let wk_j3_rotate = 0
    if(min_dis > side_c){
      wk_j2_rotate = angle_base
      wk_j3_rotate = 180
    }else
    if(side_c >= max_dis){
      wk_j2_rotate = angle_base
      wk_j3_rotate = 0
    }else{
      let angle_B = toAngle(Math.acos((side_a ** 2 + side_c ** 2 - side_b ** 2) / (2 * side_a * side_c)))
      let angle_C = toAngle(Math.acos((side_a ** 2 + side_b ** 2 - side_c ** 2) / (2 * side_a * side_b)))

      if(isNaN(angle_B)) angle_B = 0
      if(isNaN(angle_C)) angle_C = 0

      const angle_j2 = normalize180((angle_base - angle_B))
      const angle_j3 = normalize180((angle_C === 0 ? 0 : 180 - angle_C))
      if(isNaN(angle_j2)){
        console.log("angle_j2 指定可能範囲外！")
        dsp_message = "angle_j2 指定可能範囲外！"
        wk_j2_rotate = j2_rotate
      }else{
        wk_j2_rotate = angle_j2
      }
      if(isNaN(angle_j3)){
        console.log("angle_j3 指定可能範囲外！")
        dsp_message = "angle_j3 指定可能範囲外！"
        wk_j3_rotate = j3_rotate
      }else{
        wk_j3_rotate = angle_j3
      }
    }
    const j4_sabun = calc_side_2(-joint_pos.j4.z,joint_pos.j4.y)
    wk_j3_rotate = wk_j3_rotate + j4_sabun.k
    return {j2_rotate:wk_j2_rotate,j3_rotate:wk_j3_rotate,dsp_message}
  }
  
  const round = (x,d=5)=>{
    const v = 10 ** (d|0)
    return Math.round(x*v)/v
  }

  const normalize180 = (angle)=>{
    if(Math.abs(angle) <= 180){
      return angle
    }
    const amari = angle % 180
    if(amari === 0){
      return amari
    }else
    if(amari < 0){
      return (180 + amari)
    }else{
      return (-180 + amari)
    }
  }

  const toAngle = (radian)=>{
    return normalize180(radian*(180/Math.PI))
  }

  const toRadian = (angle)=>{
    return normalize180(angle)*(Math.PI/180)
  }

  const getposq = (parts_obj)=>{
    const mat = parts_obj.matrixWorld
    let position = new THREE.Vector3();
    let quaternion = new THREE.Quaternion();
    let scale = new THREE.Vector3()
    mat.decompose(position, quaternion, scale)
    return {position, quaternion, scale}
  }

  const getpos = (position)=>{
    const wkpos = {x:(position.x),y:(position.y),z:(position.z)}
    return wkpos
  }

  const distance = (s_pos, t_pos)=>{
    return (Math.sqrt((t_pos.x - s_pos.x) ** 2 + (t_pos.y - s_pos.y) ** 2 + (t_pos.z - s_pos.z) ** 2))
  }

  const calc_side_1 = (syahen, kakudo)=>{
    const teihen = (Math.abs(kakudo)===90  ? 0:(syahen * Math.cos(toRadian(kakudo))))
    const takasa = (Math.abs(kakudo)===180 ? 0:(syahen * Math.sin(toRadian(kakudo))))
    return {a:teihen, b:takasa}
  }

  const calc_side_2 = (teihen, takasa)=>{
    const syahen = (Math.sqrt(teihen ** 2 + takasa ** 2))
    const kakudo = (toAngle(Math.atan2(teihen, takasa)))
    return {s:syahen, k:kakudo}
  }

  const calc_side_4 = (syahen, teihen)=>{
    const wk_rad = Math.acos(teihen / syahen)
    const takasa = (teihen * Math.tan(wk_rad))
    const kakudo = (toAngle(wk_rad))
    return {k:kakudo, t:takasa}
  }

  React.useEffect(() => {
    if(rendered){
      const box15_result = getposq(p15_object)
      const p15_pos = getpos(box15_result.position)
      set_p15_pos(p15_pos)

      const box16_result = getposq(p16_object)
      const p16_pos = getpos(box16_result.position)
      set_p16_pos(p16_pos)

      set_p15_16_len(distance(p15_pos,p16_pos))
    }
  },[now])

  React.useEffect(() => {
    if(!registered){
      registered = true

      setTimeout(set_rendered(true),1)
      console.log('set_rendered')

      const teihen = joint_pos.j5.x
      const takasa = joint_pos.j3.y + joint_pos.j4.y
      const result = calc_side_2(teihen, takasa)
      set_p14_maxlen(result.s)

      set_x_vec_base(new THREE.Vector3(1,0,0).normalize())
      set_y_vec_base(new THREE.Vector3(0,1,0).normalize())
      set_z_vec_base(new THREE.Vector3(0,0,1).normalize())
    
      AFRAME.registerComponent('robot-click', {
        init: function () {
          this.el.addEventListener('click', (evt)=>{
            robotChange()
            console.log('robot-click')
          });
        }
      });
      AFRAME.registerComponent('j_id', {
        schema: {type: 'number', default: 0},
        init: function () {
          if(this.data === 1){
            set_j1_object(this.el.object3D)
          }else
          if(this.data === 2){
            set_j2_object(this.el.object3D)
          }else
          if(this.data === 3){
            set_j3_object(this.el.object3D)
          }else
          if(this.data === 4){
            set_j4_object(this.el.object3D)
          }else
          if(this.data === 5){
            set_j5_object(this.el.object3D)
          }else
          if(this.data === 6){
            set_j6_object(this.el.object3D)
          }else
          if(this.data === 11){
            set_p11_object(this.el.object3D)
          }else
          if(this.data === 12){
            set_p12_object(this.el.object3D)
          }else
          if(this.data === 13){
            set_p13_object(this.el.object3D)
          }else
          if(this.data === 14){
            set_p14_object(this.el.object3D)
          }else
          if(this.data === 15){
            set_p15_object(this.el.object3D)
          }else
          if(this.data === 16){
            set_p16_object(this.el.object3D)
          }else
          if(this.data === 20){
            set_p20_object(this.el.object3D)
          }else
          if(this.data === 21){
            set_p21_object(this.el.object3D)
          }else
          if(this.data === 22){
            set_p22_object(this.el.object3D)
          }else
          if(this.data === 51){
            set_p51_object(this.el.object3D)
          }
        },
        remove: function () {
          if(this.data === 16){
            set_p16_object(this.el.object3D)
          }
        }
      });
      AFRAME.registerComponent('vr-controller-right', {
        schema: {type: 'string', default: ''},
        init: function () {
          set_controller_object(this.el.object3D)
          this.el.object3D.rotation.order = order
          this.el.addEventListener('triggerdown', (evt)=>{
            const wk_start_pos = new THREE.Vector3().applyMatrix4(this.el.object3D.matrix)
            set_start_pos(wk_start_pos)
            set_trigger_on(true)
          });
          this.el.addEventListener('triggerup', (evt)=>{
            set_save_target(undefined)
            set_trigger_on(false)
          });
        }
      });
      AFRAME.registerComponent('scene', {
        schema: {type: 'string', default: ''},
        init: function () {
          //this.el.enterVR();
          this.el.addEventListener('enter-vr', ()=>{
//            vrModeRef.current = true;
            set_vr_mode(true)
            console.log('enter-vr')
            
            // ここからMQTT Start
            let xrSession = this.el.renderer.xr.getSession();
            xrSession.requestAnimationFrame(onXRFrameMQTT);
            
          });
          this.el.addEventListener('exit-vr', ()=>{
//            vrModeRef.current = false;
            set_vr_mode(false)
            console.log('exit-vr')
          });
        },
        tick: function (t) {
          setTick(t)
        }
      });
    }
  }, [])

  // XR のレンダリングフレーム毎に MQTTを呼び出したい
  const onXRFrameMQTT = (time, frame) => {
    // for next frame
    frame.session.requestAnimationFrame(onXRFrameMQTT);

    if ((mqttclient != null) && publish ) {// 状態を受信していないと、送信しない
      // MQTT 送信
      const ctl_json = JSON.stringify({
        time: time,
        joints: rotate,
//        trigger: [gripRef.current, buttonaRef.current, buttonbRef.current, gripValueRef.current]
      });

      publishMQTT(MQTT_CTRL_TOPIC, ctl_json);
    }

  }


  const edit_pos = (posxyz)=>`${posxyz.x} ${posxyz.y} ${posxyz.z}`

  const controllerProps = {
    robotName, robotNameList, set_robotName,
    target, set_target,
    toolName, toolNameList, set_toolName,
    j1_rotate,set_j1_rotate,j2_rotate,set_j2_rotate,j3_rotate,set_j3_rotate,
    j4_rotate,set_j4_rotate,j5_rotate,set_j5_rotate,j6_rotate,set_j6_rotate,j7_rotate,set_j7_rotate,
    c_pos_x,set_c_pos_x,c_pos_y,set_c_pos_y,c_pos_z,set_c_pos_z,
    c_deg_x,set_c_deg_x,c_deg_y,set_c_deg_y,c_deg_z,set_c_deg_z,
    wrist_rot_x,set_wrist_rot_x,wrist_rot_y,set_wrist_rot_y,wrist_rot_z,set_wrist_rot_z,
    tool_rotate,set_tool_rotate,normalize180, vr_mode
  }

  const robotProps = {
    robotNameList, robotName, joint_pos, j2_rotate, j3_rotate, j4_rotate, j5_rotate, j6_rotate, j7_rotate,
    toolNameList, toolName, cursor_vis, box_vis, edit_pos
  }

  if(rendered){
    return (
    <>
      <a-scene scene>
        <a-entity oculus-touch-controls="hand: right" vr-controller-right visible={`${false}`}></a-entity>
        <a-plane position="0 0 0" rotation="-90 0 0" width="10" height="10" color={target_error?"#ff7f50":"#7BC8A4"}></a-plane>
        <Assets/>
        <Select_Robot {...robotProps}/>
        <Cursor3dp j_id="20" pos={{x:0,y:0,z:0}} visible={cursor_vis}>
          <Cursor3dp j_id="21" pos={{x:0,y:0,z:p15_16_len}} visible={cursor_vis}></Cursor3dp>
          <Cursor3dp j_id="22" pos={{x:0,y:-joint_pos.j5.y,z:0}} rot={{x:0,y:j1_rotate,z:0}} visible={cursor_vis}></Cursor3dp>
        </Cursor3dp>
        <a-entity light="type: directional; color: #FFF; intensity: 0.25" position="1 1 1"></a-entity>
        <a-entity light="type: directional; color: #FFF; intensity: 0.25" position="-1 1 1"></a-entity>
        <a-entity light="type: directional; color: #EEE; intensity: 0.25" position="-1 1 -1"></a-entity>
        <a-entity light="type: directional; color: #FFF; intensity: 0.25" position="1 1 -1"></a-entity>
        <a-entity light="type: directional; color: #EFE; intensity: 0.05" position="0 -1 0"></a-entity>
        <a-entity id="rig" position={`${c_pos_x} ${c_pos_y} ${c_pos_z}`} rotation={`${c_deg_x} ${c_deg_y} ${c_deg_z}`}>
          <a-camera id="camera" cursor="rayOrigin: mouse;" position="0 0 0"></a-camera>
        </a-entity>
        <a-sphere position={edit_pos(target)} scale="0.012 0.012 0.012" color={target_error?"red":"yellow"} visible={`${false}`}></a-sphere>
        <a-box position={edit_pos(test_pos)} scale="0.03 0.03 0.03" color="green" visible={`${box_vis}`}></a-box>
        <Line pos1={{x:1,y:0.0001,z:1}} pos2={{x:-1,y:0.0001,z:-1}} visible={cursor_vis} color="white"></Line>
        <Line pos1={{x:1,y:0.0001,z:-1}} pos2={{x:-1,y:0.0001,z:1}} visible={cursor_vis} color="white"></Line>
        <Line pos1={{x:1,y:0.0001,z:0}} pos2={{x:-1,y:0.0001,z:0}} visible={cursor_vis} color="white"></Line>
        <Line pos1={{x:0,y:0.0001,z:1}} pos2={{x:0,y:0.0001,z:-1}} visible={cursor_vis} color="white"></Line>
        {/*<a-cylinder j_id="51" color="green" height="0.1" radius="0.005" position={edit_pos({x:0.3,y:0.3,z:0.3})}></a-cylinder>*/}
      </a-scene>
      <Controller {...controllerProps}/>
      <div className="footer" >
        <div>{`wrist_degree:{direction:${round(wrist_degree.direction)},angle:${round(wrist_degree.angle)}}  ${dsp_message}`}</div>
      </div>
    </>
    );
  }else{
    return(
      <a-scene>
        <Assets/>
      </a-scene>
    )
  }
}

const Assets = ()=>{
  return (
    <a-assets>
      {/*Model*/}
      <a-asset-items id="base" src="../base_link.gltf" ></a-asset-items>
      <a-asset-items id="j1" src="../link1.gltf" ></a-asset-items>
      <a-asset-items id="j2" src="../link2.gltf" ></a-asset-items>
      <a-asset-items id="j3" src="../link3.gltf" ></a-asset-items>
      <a-asset-items id="j4" src="../link4.gltf" ></a-asset-items>
      <a-asset-items id="j5" src="../link5.gltf" ></a-asset-items>
      <a-asset-items id="j6" src="../link6.gltf" ></a-asset-items>
      <a-asset-items id="j7" src="../link7.gltf" ></a-asset-items>
      <a-asset-items id="j8_r" src="../link8_r.gltf" ></a-asset-items>
      <a-asset-items id="j8_l" src="../link8_l.gltf" ></a-asset-items>
    </a-assets>
  )
}

const Model = (props)=>{
  const {visible, cursor_vis, edit_pos, joint_pos} = props
  return (<>{visible?
    <a-entity robot-click="" gltf-model="#base" position={edit_pos(joint_pos.base)} visible={`${visible}`}>
      <a-entity j_id="1" gltf-model="#j1" position={edit_pos(joint_pos.j1)}>
        <a-entity j_id="2" gltf-model="#j2" position={edit_pos(joint_pos.j2)}>
          <a-entity j_id="3" gltf-model="#j3" position={edit_pos(joint_pos.j3)}>
            <a-entity j_id="4" gltf-model="#j4" position={edit_pos(joint_pos.j4)}>
              <a-entity j_id="5" gltf-model="#j5" position={edit_pos(joint_pos.j5)}>
                <a-entity j_id="6" gltf-model="#j6" position={edit_pos(joint_pos.j6)}>
                  <Model_Tool {...props}/>
                  {/*<a-cylinder color="crimson" height="0.1" radius="0.005" position={edit_pos(joint_pos.j7)}></a-cylinder>*/}
                </a-entity>
                <Cursor3dp j_id="15" visible={cursor_vis}/>
              </a-entity>
              <Cursor3dp j_id="14" pos={{x:joint_pos.j5.x,y:0,z:0}} visible={cursor_vis}/>
              <Cursor3dp j_id="13" visible={cursor_vis}/>
            </a-entity>
            {/*<Cursor3dp j_id="12" visible={cursor_vis}/>*/}
          </a-entity>
          {/*<Cursor3dp j_id="11" visible={cursor_vis}/>*/}
        </a-entity>
      </a-entity>
    </a-entity>:null}</>
  )
}

const Model_Tool = (props)=>{
  const Toolpos = {x:0,y:0,z:0}
  const {j7_rotate, joint_pos:{j7:j7pos}, cursor_vis, box_vis, edit_pos} = props
  const x = 36/90
  const finger_pos = ((j7_rotate*x) / 1000)+0.0004
  const j8_r_pos = { x: finger_pos, y:0, z:0.27 }
  const j8_1_pos = { x: -finger_pos, y:0, z:0.27 }

  const return_table = [
    <>
      <a-entity gltf-model="#j7" position={edit_pos(j7pos)}></a-entity>
      <a-entity gltf-model="#j8_r" position={edit_pos(j8_r_pos)}></a-entity>
      <a-entity gltf-model="#j8_l" position={edit_pos(j8_1_pos)}></a-entity>
      <Cursor3dp j_id="16" pos={j7pos} visible={cursor_vis}/>
      <a-box color="yellow" scale="0.02 0.02 0.02" position={edit_pos(j7pos)} visible={`${box_vis}`}></a-box>
    </>,
  ]
  const {toolNameList, toolName} = props
  const findindex = toolNameList.findIndex((e)=>e===toolName)
  if(findindex >= 0){
    return (return_table[findindex])
  }
  return null
}

const Select_Robot = (props)=>{
  const {robotNameList, robotName, ...rotateProps} = props
  const visibletable = robotNameList.map(()=>false)
  // const robotNameList = ["Model"]
  const findindex = robotNameList.findIndex((e)=>e===robotName)
  if(findindex >= 0){
    visibletable[findindex] = true
  }
  return (<>
    <Model visible={visibletable[0]} {...rotateProps}/>
  </>)
}

const Cursor3dp = (props) => {
  const { pos={x:0,y:0,z:0}, rot={x:0,y:0,z:0}, len=0.3, opa=1, children, visible=false, ...otherprops } = props;

  const line_x = `start: 0 0 0; end: ${len} 0 0; color: red; opacity: ${opa};`
  const line_y = `start: 0 0 0; end: 0 ${len} 0; color: green; opacity: ${opa};`
  const line_z = `start: 0 0 0; end: 0 0 ${len}; color: blue; opacity: ${opa};`

  return <a-entity
      {...otherprops}
      line={line_x}
      line__1={line_y}
      line__2={line_z}
      position={`${pos.x} ${pos.y} ${pos.z}`}
      rotation={`${rot.x} ${rot.y} ${rot.z}`}
      visible={`${visible}`}
  >{children}</a-entity>
}

const Line = (props) => {
  const { pos1={x:0,y:0,z:0}, pos2={x:0,y:0,z:0}, color="magenta", opa=1, visible=false, ...otherprops } = props;

  const line_para = `start: ${pos1.x} ${pos1.y} ${pos1.z}; end: ${pos2.x} ${pos2.y} ${pos2.z}; color: ${color}; opacity: ${opa};`

  return <a-entity
      {...otherprops}
      line={line_para}
      position={`0 0 0`}
      visible={`${visible}`}
  ></a-entity>
}
