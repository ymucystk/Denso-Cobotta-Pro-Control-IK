"use client";
import 'aframe'
import * as React from 'react'
const THREE = window.AFRAME.THREE; // これで　AFRAME と　THREEを同時に使える

import { AppMode } from './appmode.js';
import Controller from './controller.js'
import { connectMQTT, mqttclient, idtopic, subscribeMQTT, publishMQTT, codeType } from '../lib/MetaworkMQTT'

import StereoVideo from '../lib/stereoWebRTC.js';

const AIST_logging = false; // AIST MQTT ロギングを有効にするか 

const MQTT_REQUEST_TOPIC = "mgr/request";
const MQTT_DEVICE_TOPIC = "dev/" + idtopic;
const MQTT_CTRL_TOPIC = "control/" + idtopic; // 自分のIDに制御を送信
const MQTT_ROBOT_STATE_TOPIC = "robot/";
const MQTT_AIST_LOGGER_TOPIC = "AIST/logger/Cobotta";
let publish = true //VRモードに移行するまではMQTTをpublishしない（かつ、ロボット情報を取得するまで）
let receive_state = false // ロボットの状態を受信してるかのフラグ

const joint_pos = {
  base: { x: 0, y: 0, z: 0 },
  j1: { x: 0, y: 0, z: 0 },
  j2: { x: 0, y: 0.21, z: 0 },
  j3: { x: 0, y: 0.51, z: 0 },
  j4: { x: -0.03, y: 0.39, z: 0 },
  j5: { x: 0, y: 0, z: 0 },
  j6: { x: 0.15, y: 0, z: 0 },
  //  j7: { x: 0, y: 0, z: 0.18 },
  j7: { x: 0, y: 0, z: 0.18 },
}
const j1_limit = 270 - 10
const j2_limit = 150 - 10
const j3_limit = 150 - 10
const j4_limit = 270 - 10
const j5_limit = 150 - 10
const j6_limit = 360 - 10


let registered = false
let trigger_on = false
const cursor_vis = false
const box_vis = false /// デバッグ用 四角
const order = 'ZYX'

const x_vec_base = new THREE.Vector3(1, 0, 0).normalize()
const y_vec_base = new THREE.Vector3(0, 1, 0).normalize()
const z_vec_base = new THREE.Vector3(0, 0, 1).normalize()

const controller_start_quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.6654549523360951, 0, 0, order))
const controller_progress_quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.6654549523360951, 0, 0, order))
const robot_save_quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.6654549523360951, 0, 0, order))
const controller_acc_quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0, order))



const max_move_unit = [(1 / 120), (1 / 70), (1 / 120), (1 / 150), (1 / 150), (1 / 240)]
const rotate_table = [[], [], [], [], [], []]
const object3D_table = []
const rotvec_table = [y_vec_base, x_vec_base, x_vec_base, y_vec_base, x_vec_base, z_vec_base]
let target_move_distance = 0
const target_move_speed = (1000 / 0.5)
//let real_target = {x:0.4,y:0.8,z:-0.4}
//let real_target = { x: 0.3, y: 0.25, z: -0.5 }
let real_target = { x: -0.07, y: 0.20, z: -0.5 }
let baseObject3D = new THREE.Object3D()

// 実ロボットとバーチャルロボットの差分
const j1_Correct_value = 180.0
const j2_Correct_value = 0.0
const j3_Correct_value = 0.0
const j4_Correct_value = 0.0
const j5_Correct_value = 90.0
const j6_Correct_value = 0.0

// 各ジョイントの初期値
//const [j1_init, j2_init, j3_init, j4_init, j5_init, j6_init] = [0+j1_Correct_value,20,65,0,5+j5_Correct_value,78]
//const [j1_init, j2_init, j3_init, j4_init, j5_init, j6_init] = [0+j1_Correct_value,0,0,0,0+j5_Correct_value,0]
const [j1_init, j2_init, j3_init, j4_init, j5_init, j6_init] = [0, 0, 0, 0, 0, 0]


let j1_error = false
let j2_error = false
let j3_error = false
let j4_error = false
let j5_error = false
let j6_error = false

let tickprev = 0
let controller_object = new THREE.Object3D()
const controller_object_position = new THREE.Vector3()
const controller_object_quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0, order))
let xrSession = undefined

const Toolpos1 = { rot: { x: 90, y: 0, z: 0 }, pos: { x: -0.1, y: -0.02, z: 0.4 }, toolrot: 0 }
const Toolpos2 = { rot: { x: 90, y: 0, z: 0 }, pos: { x: -0.3, y: -0.02, z: 0.4 }, toolrot: 0 }
const Toolpos1front = { rot: { x: 90, y: 0, z: 0 }, pos: { x: -0.1, y: -0.02, z: 0.55 }, toolrot: 0 }
const Toolpos2front = { rot: { x: 90, y: 0, z: 0 }, pos: { x: -0.3, y: -0.02, z: 0.55 }, toolrot: 0 }
const Toolpos1upper = { rot: { x: 90, y: 0, z: 0 }, pos: { x: -0.1, y: 0.07, z: 0.4 }, toolrot: 0 }
const Toolpos2upper = { rot: { x: 90, y: 0, z: 0 }, pos: { x: -0.3, y: 0.07, z: 0.4 }, toolrot: 0 }
const ToolChangeTbl = []
let ToolChangeMove = false

let put_down_box_value = undefined
let tool_change_value = undefined
let tool_current_value = undefined
let tool_menu_on = false
let tool_load_operation = false
let tool_load_timeout_id = 0
let put_down_box_operation = false
let line_cut_operation = false
let line_cut_value = undefined
let line_cut_timeout_id = 0
let put_down_box_timeout_id = 0
let tool_menu_idx = 0
const tool_menu_list = ["Gripper", "vgc10-1", "cutter", "boxLiftUp"]
const add_menu_1 = tool_menu_list.length    // 1つめ Box Tool
const add_menu_2 = tool_menu_list.length +1 // 2つめ
const tool_menu_max = tool_menu_list.length + 2
let save_tool_menu_idx = 0
let save_thumbstickmoved = 0
let firstReceiveJoint = true
let viewer_tool_change = false
let viewer_tool_change_end = undefined
let viewer_put_down_box = false
let viewer_put_down_box_end = undefined

let switchingVrMode = false    // enter-vr 後 3秒まって動く
let robotOperation = true
const luggage_obj_list = {}
let endTool_obj = undefined
let touchLuggage = undefined
let fallingLuggage = undefined // 落下中の荷物
let fallingSpeed = 0 // 落下中の荷物の速度
let carryLuggage = false
let boxpos_x = -0.2; // luggage-id 荷物の初期位置


// 再レンダリングしなくて値を更新する（かつ set_update で再レンダリングさせられる）
function useRefState(initialValue = undefined, updateFunc = undefined) {
  const ref = React.useRef(initialValue);
  function setValue(arg) {
    if (typeof arg === 'function') {
      ref.current = arg(ref.current)
    } else {
      ref.current = arg
    }
    if (updateFunc) {
      updateFunc((v) => v = v + 1)
    }
  }
  return [ref.current, setValue, ref];
}

function getWorldEuler(obj, order = 'XYZ'){
  // 親まで含めた最新のワールド行列を更新
  obj.updateMatrixWorld(true);
  // ワールド姿勢をクォータニオンで取得
  const qWorld = new THREE.Quaternion();
  obj.getWorldQuaternion(qWorld);

  // クォータニオン→オイラー（順序は必要に応じて指定）
  const eWorld = new THREE.Euler(0, 0, 0, order);
  eWorld.setFromQuaternion(qWorld, order);

  return eWorld; // ラジアン
}


export default function Home(props) {
  const [update, set_update] = React.useState(0)
  const [rendered, set_rendered] = useRefState(false)
  const [target_error, set_target_error] = useRefState(false)

  const RightRef = React.useRef(null);
  const CameraRef = React.useRef(null);
  const aButtonRef = React.useRef(false);
  const bButtonRef = React.useRef(false);
  const axisRef = React.useRef({ x: 0, y: 0 });

  //  const [controller_reframe, set_controller_reframe]  = React.useState(new THREE.Euler(0,0,0,order))
  const [controller_reframe, set_controller_reframe] = React.useState(new THREE.Quaternion())
  const [controller_reframe1, set_controller_reframe1] = React.useState(new THREE.Quaternion())
  const [controller_reframe2, set_controller_reframe2] = React.useState(new THREE.Quaternion())
  const [controller_reframe3, set_controller_reframe3] = React.useState(new THREE.Quaternion())
  const [controller_reframe4, set_controller_reframe4] = React.useState(new THREE.Quaternion())


  const vrModeAngle_ref = React.useRef(0)
  let vrModeAngle = vrModeAngle_ref.current
  const set_vrModeAngle = (new_angle) => {
    document.cookie = `vrModeAngle=${new_angle}; path=/; max-age=31536000;`
    vrModeAngle = vrModeAngle_ref.current = new_angle
    if (baseObject3D) {
      baseObject3D.rotation.set(0, toRadian(vrModeAngle), 0)
    }
    // Target も変更
    const target_pos = new THREE.Vector3().applyMatrix4(
      new THREE.Matrix4().multiply(
        new THREE.Matrix4().makeRotationY(toRadian(vrModeAngle_ref.current))
      ).multiply(
        new THREE.Matrix4().setPosition(target_ref.current.x, target_ref.current.y, target_ref.current.z)
      )
    );
    // ターゲットを変えちゃいけない（仮想ターゲットをだすべき！）
    set_disp_target((vr) => {
      vr.x = round(target_pos.x); vr.y = round(target_pos.y); vr.z = round(target_pos.z);
      return vr
    })
    set_update((v) => v = v + 1)
  }

  // 横方向のオフセットをCookieに保存
  const vrModeOffsetX_ref = React.useRef(0)
  let vrModeOffsetX = vrModeOffsetX_ref.current
  const set_vrModeOffsetX = (new_offset) => {
    document.cookie = `vrModeOffsetX=${new_offset}; path=/; max-age=31536000;`
    vrModeOffsetX = vrModeOffsetX_ref.current = new_offset
    console.log('set_vrModeOffsetX', vrModeOffsetX)
    joint_pos.base.x = vrModeOffsetX; // baseの位置を更新
    set_update((v) => v = v + 1)
  }

  // WebRTCの統計情報を記録
  const [rtcStats, set_rtcStats, rtcStats_ref] = useRefState([])


  const [j1_rotate, set_j1_rotate, j1_rotate_ref] = useRefState(j1_init)
  const [j2_rotate, set_j2_rotate, j2_rotate_ref] = useRefState(j2_init)
  const [j3_rotate, set_j3_rotate, j3_rotate_ref] = useRefState(j3_init)
  const [j4_rotate, set_j4_rotate, j4_rotate_ref] = useRefState(j4_init)
  const [j5_rotate, set_j5_rotate, j5_rotate_ref] = useRefState(j5_init)
  const [j6_rotate, set_j6_rotate, j6_rotate_ref] = useRefState(j6_init)
  const [j7_rotate, set_j7_rotate, j7_rotate_ref] = useRefState(0)
  const [j6_rotate_org, set_j6_rotate_org, j6_rotate_org_ref] = useRefState(0) // これは？　Tool の回転？

  /*const outputRotateRef = React.useRef(
    [-j1_Correct_value,-j2_Correct_value,-j3_Correct_value,-j4_Correct_value,-j5_Correct_value,-j6_Correct_value,0]
  );*/ // ref を使って outputRotate を保持する
  const [outputRotate, set_outputRotate, outputRotateRef] = useRefState(
    [j1_init - j1_Correct_value, j2_init - j2_Correct_value, j3_init - j3_Correct_value, j4_init - j4_Correct_value, j5_init - j5_Correct_value, j6_init - j6_Correct_value, 0]
  )
  const [checkRotate, set_checkRotate, checkRotateRef] = useRefState(outputRotate)

  const prevRotateRef = React.useRef([0, 0, 0, 0, 0, 0, 0]) //前回の関節角度

  const [input_rotate, set_input_rotate, input_rotateRef] = useRefState([undefined, 0, 0, 0, 0, 0, 0])
  const inputRotateFlg = React.useRef(false) // 外部から rotate情報が入ってきたら true

  const [p15_object, set_p15_object] = useRefState(new THREE.Object3D())
  const [p16_object, set_p16_object] = useRefState(new THREE.Object3D())
  const targetRef = React.useRef(null); // target 位置

  const [p51_object, set_p51_object] = useRefState(new THREE.Object3D())

  const [grip, set_grip, gripRef] = useRefState(false);

  const [start_pos, set_start_pos] = useRefState(new THREE.Object3D())
  const [save_target, set_save_target] = useRefState()

  //const vrModeRef = React.useRef(false); // vr_mode はref のほうが使いやすい
  const [vr_mode, set_vr_mode, vrModeRef] = useRefState(false)
  const robotIDRef = React.useRef("none");

  const [test_pos, set_test_pos] = useRefState({ x: 0, y: 0, z: 0 })

  const [c_pos_x, set_c_pos_x] = useRefState(0)
  const [c_pos_y, set_c_pos_y] = useRefState(0.45)
  const [c_pos_z, set_c_pos_z] = useRefState(1.2)
  const [c_deg_x, set_c_deg_x] = useRefState(0)
  const [c_deg_y, set_c_deg_y] = useRefState(0)
  const [c_deg_z, set_c_deg_z] = useRefState(0)


  const [wrist_rot, set_wrist_rot_org, wrist_rot_ref] = useRefState({ x: 90, y: 90, z: 0 })
  const [tool_rotate, set_tool_rotate, tool_rotate_ref] = useRefState(0)
  const [wrist_degree, set_wrist_degree] = useRefState({ direction: 0, angle: 0 })
  const [dsp_message, set_dsp_message] = useRefState("")
  const [fps_message, set_fps_message] = useRefState("0 fps")

  const toolNameList = ["No tool", "Gripper", "vgc10-1", "vgc10-4", "cutter", "boxLiftUp"]
  const toolDiffList = [0, 0.14, 0.23, 0.23, 0.05, 0.05] // ツール先端からJ6までの距離
  const [toolName, set_toolName_org, toolNameRef] = useRefState(toolNameList[1])
  const [tool_diff, set_tool_diff] = React.useState(toolDiffList[1]) // ツール先端からJ6までの距離
  const set_toolName = (newTool) => {// ツール名称の変更はここで実施。その際に、target と J6 の距離も変更
    const wk_tool_value = tool_menu_list.indexOf(newTool)
    if (wk_tool_value >= 0) {
      tool_menu_idx = wk_tool_value
      tool_current_value = wk_tool_value + 1
      const tool_diff_idx = toolNameList.indexOf(newTool)
      console.log("Set Tool diff",toolDiffList[tool_diff_idx], tool_diff_idx)
      set_tool_diff( toolDiffList[tool_diff_idx])
    } else {
      tool_menu_idx = 0
      tool_current_value = undefined
    }
    document.cookie = `toolName=${newTool}; path=/; max-age=31536000;`
    set_toolName_org(newTool)
  }

  const [target, set_target_org, target_ref] = useRefState(real_target)
  const [disp_target, set_disp_target, disp_target_ref] = useRefState({ x: 0, y: 0, z: 0 })
  const [p15_16_len, set_p15_16_len] = useRefState(joint_pos.j7.z + tool_diff) // これが重要（エンドエフェクタ (TCP)の位置
  const [p14_maxlen, set_p14_maxlen] = useRefState(0)

  const [do_target_update, set_do_target_update] = useRefState(0)


  const [debug_message, set_debug_message] = React.useState("")
  const add_debug_message = (message) => {
    set_debug_message((prev) => (prev + " " + message))
  }

  function getCookie(name) {
    const value = document.cookie
      .split('; ')
      .find(row => row.startsWith(name + '='));
    return value ? value.split('=')[1] : undefined;
  }

  // Cooike, Offsetの取得
  React.useEffect(() => {
    const wk_vrModeAngle = getCookie('vrModeAngle')
    set_vrModeAngle(wk_vrModeAngle ? parseFloat(wk_vrModeAngle) : 90) // change default to 90
    const wk_vrModeOffsetX = getCookie('vrModeOffsetX')
    set_vrModeOffsetX(wk_vrModeOffsetX ? parseFloat(wk_vrModeOffsetX) : 0.55)
    const wk_toolName = getCookie('toolName')
    set_toolName(wk_toolName ? wk_toolName : "vgc10-1") // changeDefault to "vgc10-1" for DEMO
    //    set_toolName(wk_toolName ? wk_toolName : "Gripper") // changeDefault to "vgc10-1" for DEMO
  }, [])

  // VR モード終了時
  React.useEffect(() => {
    if (!(props.appmode === AppMode.viewer) && !(props.appmode === AppMode.monitor) && !vr_mode) {
      requestAnimationFrame(get_real_joint_rot)
    }
  }, [vr_mode])
  let lastRotate = [0, 0, 0, 0, 0, 0, 0]

  const get_real_joint_rot = () => {
    if (!(props.appmode === AppMode.viewer) && !(props.appmode === AppMode.monitor)) {
      /*
      const isDiff = lastRotate.some((v, i) => v !== outputRotateRef.current[i])
      if (isDiff) {
        console.log("GetRealJoint:", outputRotateRef.current)
        console.log("joints:", [j1_rotate_ref.current, j2_rotate_ref.current, j3_rotate_ref.current, j4_rotate_ref.current])
        lastRotate = [...outputRotateRef.current]
      }*/
      if (object3D_table.length === 6 && switchingVrMode === false) { //
        const axis_tbl = ['y', 'x', 'x', 'y', 'x', 'z']
        const new_rotate = object3D_table.map((obj3d, idx) => {
          //return round(toAngle(obj3d.rotation[axis_tbl[idx]]))
          const qk_q_a = quaternionToAngle(obj3d.quaternion)
          const flg = qk_q_a.axis[axis_tbl[idx]] < 0
          return round(qk_q_a.angle * (flg ? -1 : 1))
        })
        new_rotate[6] = round(j7_rotate_ref.current)
        //        console.log('Get Real Joint: new_rotate',new_rotate)
        const prev_rotate = prevRotateRef.current

        if (prev_rotate[0] !== new_rotate[0] ||
          prev_rotate[1] !== new_rotate[1] ||
          prev_rotate[2] !== new_rotate[2] ||
          prev_rotate[3] !== new_rotate[3] ||
          prev_rotate[4] !== new_rotate[4] ||
          prev_rotate[5] !== new_rotate[5] ||
          prev_rotate[6] !== new_rotate[6]) {
          //console.log('new_rotate',new_rotate)

          const conv_result = outRotateConv({
            j1_rotate: new_rotate[0],
            j2_rotate: new_rotate[1],
            j3_rotate: new_rotate[2],
            j4_rotate: new_rotate[3],
            j5_rotate: new_rotate[4],
            j6_rotate: new_rotate[5]
          }, [...outputRotateRef.current])

          if (conv_result.error_info !== undefined) {
            const error_info = conv_result.error_info
            for (let i = 0; i < error_info.length; i++) {
              if (error_info[i].check_value >= 180) {
                console.log(`Out of 180: j${error_info[i].joint}_rotate`, error_info[i].rotate, normalize180(error_info[i].rotate))
                conv_result[`j${error_info[i].joint}_rotate`] = normalize180(error_info[i].rotate)
              } else {
                const check_rot = normalize180(error_info[i].rotate)
                if (Math.abs(check_rot) < error_info[i].check_value) {
                  console.log(`Out of check: j${error_info[i].joint}_rotate`, error_info[i].rotate, check_rot)
                  conv_result[`j${error_info[i].joint}_rotate`] = check_rot
                }
              }
            }
          }

          const robot_rotate = [
            conv_result.j1_rotate,
            conv_result.j2_rotate,
            conv_result.j3_rotate,
            conv_result.j4_rotate,
            conv_result.j5_rotate,
            conv_result.j6_rotate,
            new_rotate[6]
          ]
          //console.log('robot_rotate',robot_rotate)
          //outputRotateRef.current = [...robot_rotate]
          set_outputRotate([...robot_rotate])
        }
        prevRotateRef.current = [...new_rotate]
      }
      if (xrSession !== undefined) {// 毎アニメーションフレーム動作
        xrSession.requestAnimationFrame(get_real_joint_rot)
      } else {
        requestAnimationFrame(get_real_joint_rot)
      }
    }
  }

  function convertToMesh(object3D, material = undefined) {
    if (object3D.isMesh) return object3D;
    if (object3D.geometry) {
      return new THREE.Mesh(
        object3D.geometry,
        material || new THREE.MeshNormalMaterial()
      );
    }
    let mesh = null;
    object3D.traverse((child) => {
      if (!mesh && child.geometry) {
        mesh = new THREE.Mesh(
          child.geometry,
          material || new THREE.MeshNormalMaterial()
        );
      }
    });
    return mesh;
  }

  const set_target = (new_pos) => {
    //    console.log("SetTarget",new_pos)
    //let wk_new_pos = { ...new_pos }
    // 表示用のターゲットを設定
    let disp_target_pos = new THREE.Vector3().applyMatrix4(
      new THREE.Matrix4().multiply(
        new THREE.Matrix4().makeRotationY(toRadian(vrModeAngle_ref.current))
      ).multiply(
        new THREE.Matrix4().setPosition(new_pos.x, new_pos.y, new_pos.z)
      )
    );
    if (props.appmode === AppMode.practice) { // 練習モードの時のみ     
      if (!carryLuggage) {// 握っていないとき
        // target to disp_target

        const touchResult = boxTouchCheck(disp_target_pos, disp_target_ref.current)
        if (touchResult.result) {
          //          set_debug_message(`bTst: ${touchResult.touchPoint.x}`)
          touchLuggage = touchResult.key
          disp_target_pos = { ...touchResult.touchPoint } // ぶつけないための target を変更
        } else {
          touchLuggage = undefined
        }
      } else // 荷物を運んでいるとき
        if (touchLuggage !== undefined) {
          const prevpos = { ...disp_target_ref.current }
          const diffpos = pos_sub(disp_target_pos, prevpos)
          const obj = luggage_obj_list[touchLuggage]
          const mesh = convertToMesh(obj)
          const posAttr = mesh.geometry.attributes.position
          const vertex = new THREE.Vector3()
          const worldVertices = []
          for (let i = 0; i < posAttr.count; i = i + 1) {
            vertex.fromBufferAttribute(posAttr, i)
            vertex.applyMatrix4(obj.matrixWorld)
            worldVertices.push(vertex.clone())
          }
          const w_min_vertex = new THREE.Vector3(0, Infinity, 0)
          for (let i = 0; i < worldVertices.length; i = i + 1) {
            if (worldVertices[i].y < w_min_vertex.y) {
              w_min_vertex.copy(worldVertices[i])
            }
          }
          const check_pos = pos_add(w_min_vertex, diffpos)
          if (check_pos.y < 0) {
            disp_target_pos = { ...disp_target_ref.current }
          }
        }
    }
    if (!inputRotateFlg.current) {
      if (disp_target.x !== disp_target_pos.x || disp_target.y !== disp_target_pos.y || disp_target.z !== disp_target_pos.z) {
        target_move_distance = distance(disp_target, disp_target_pos)
        //        console.log("Distance: ", round(target_move_distance), real_target)
        // ここで逆変換
        const wk_new_pos = new THREE.Vector3().applyMatrix4(
          new THREE.Matrix4().multiply(
            new THREE.Matrix4().makeRotationY(toRadian(-vrModeAngle_ref.current))
          ).multiply(
            new THREE.Matrix4().setPosition(disp_target_pos.x, disp_target_pos.y, disp_target_pos.z)
          )
        );
        set_target_org(wk_new_pos)
      }
    }
  }

  const set_wrist_rot = (new_rot) => {
    if (!inputRotateFlg.current) {
      target_move_distance = 0
      set_wrist_rot_org({ ...new_rot })
    }
  }

  // コントローラの移動を取得
  React.useEffect(() => {
    if (rendered && vrModeRef.current && trigger_on && !tool_menu_on && !tool_load_operation && !put_down_box_operation && !switchingVrMode) {
      const move_pos = pos_sub(start_pos, controller_object_position)
      //move_pos.x = move_pos.x/2
      //move_pos.y = move_pos.y/2
      //move_pos.z = move_pos.z/2

      /// ここで回転させて、方向を利用 (disp_target の移動を 元のtargetに)
      const rot_move_pos = new THREE.Vector3().applyMatrix4(
        new THREE.Matrix4().multiply(
          new THREE.Matrix4().makeRotationY(toRadian(-vrModeAngle_ref.current))
        ).multiply(
          new THREE.Matrix4().setPosition(move_pos.x, move_pos.y, move_pos.z)
        )
      );
      // ここで移動速度を変更可能！

      let target_pos;
      if (save_target === undefined) {
        set_save_target({ ...target })
        target_pos = pos_sub(target, rot_move_pos)
      } else {
        target_pos = pos_sub(save_target, rot_move_pos)
      }

      if (target_pos.y < 0.012) {
        target_pos.y = 0.012
      }
      set_debug_message(`xy:${target_pos.x} ${target_pos.y}`)
      set_target({ x: round(target_pos.x), y: round(target_pos.y), z: round(target_pos.z) })
    }
  }, [controller_object_position.x, controller_object_position.y, controller_object_position.z])


  React.useEffect(() => {
    if (rendered && vrModeRef.current && trigger_on && !tool_menu_on && !tool_load_operation && !put_down_box_operation && !switchingVrMode) {
      const wk_quatDiff1 = controller_progress_quat.clone().invert().multiply(controller_object_quaternion);
      const wk_diff_1 = quaternionToAngle(wk_quatDiff1)
      const quatDifference1 = new THREE.Quaternion().setFromAxisAngle(wk_diff_1.axis, wk_diff_1.radian / 3);
      const quatDifference2 = controller_start_quat.clone().invert().multiply(robot_save_quat);// robot 先端姿勢
      const wk_mtx = controller_start_quat.clone().multiply(quatDifference1).multiply(controller_acc_quat).multiply(quatDifference2);

      wk_mtx.multiply(
        new THREE.Quaternion().setFromEuler(
          new THREE.Euler(
            (0.6654549523360951 * -1),  //x
            Math.PI,  //y
            Math.PI,  //z
            order
          )
        )
      )
      //この wk_mtx を baselinkとの差をかけてあげればいいはず      
      // ベースリンクとの差  
      wk_mtx.premultiply(baseObject3D.quaternion.clone().invert())

      const wk_euler = new THREE.Euler().setFromQuaternion(wk_mtx, order)
      const wrot = { x: round(toAngle(wk_euler.x)), y: round(toAngle(wk_euler.y)), z: round(toAngle(wk_euler.z)) };
      set_debug_message(`wr:${JSON.stringify(wrot)}`)

      set_wrist_rot(wrot)
    }
  }, [controller_object_quaternion.x, controller_object_quaternion.y, controller_object_quaternion.z, controller_object_quaternion.w])


  const toolChange1 = () => {
    ToolChangeTbl.push({ ...Toolpos2front, speedfacter: 1 })
    ToolChangeTbl.push({ ...Toolpos2, speedfacter: 10 })
    ToolChangeTbl.push({ ...Toolpos2upper, speedfacter: 20 })
    ToolChangeTbl.push({ ...Toolpos1upper, speedfacter: 10 })
    ToolChangeTbl.push({ ...Toolpos1, speedfacter: 20 })
    ToolChangeTbl.push({ ...Toolpos1front, speedfacter: 10 })
    ToolChangeTbl.push({ rot: wrist_rot_ref.current, pos: target_ref.current, toolrot: tool_rotate_ref.current, speedfacter: 1 })
    console.log("target_ref.current", target_ref.current)
    if (xrSession !== undefined) {
      xrSession.requestAnimationFrame(toolChangeExec)
    } else {
      requestAnimationFrame(toolChangeExec)
    }
  }

  const toolChange2 = () => {
    ToolChangeTbl.push({ ...Toolpos1front, speedfacter: 2 })
    ToolChangeTbl.push({ ...Toolpos1, speedfacter: 10 })
    ToolChangeTbl.push({ ...Toolpos1upper, speedfacter: 20 })
    ToolChangeTbl.push({ ...Toolpos2upper, speedfacter: 10 })
    ToolChangeTbl.push({ ...Toolpos2, speedfacter: 20 })
    ToolChangeTbl.push({ ...Toolpos2front, speedfacter: 10 })
    ToolChangeTbl.push({ rot: wrist_rot_ref.current, pos: target_ref.current, toolrot: tool_rotate_ref.current, speedfacter: 2 })
    if (xrSession !== undefined) {
      xrSession.requestAnimationFrame(toolChangeExec)
    } else {
      requestAnimationFrame(toolChangeExec)
    }
  }

  // ツールチェンジ
  const toolChangeExec = () => {
    if (!ToolChangeMove && ToolChangeTbl.length > 0) {
      ToolChangeMove = true
      set_tool_rotate(ToolChangeTbl[0].toolrot)
      set_wrist_rot(ToolChangeTbl[0].rot)
      set_target(ToolChangeTbl[0].pos)
      target_move_distance *= ToolChangeTbl[0].speedfacter
      ToolChangeTbl.shift()
      if (props.appmode === AppMode.viewer && viewer_tool_change === true && ToolChangeTbl.length === 0) {
        setTimeout(() => {
          viewer_tool_change_end = true
          viewer_tool_change = false
        }, 5000)
      }
    }
  }

  //React.useEffect(()=>{
  // ジョイントを制御して動かしているときに毎回呼ばれる
  const joint_slerp = () => {
    let raw_data = 0
    //    console.log(rotate_table);
    for (let i = 0; i < rotate_table.length; i = i + 1) {
      const current_table = rotate_table[i]
      const current_object3D = object3D_table[i]
      raw_data = raw_data + current_table.length// 変更点のあったjoint がある
      if (current_object3D !== undefined && current_table.length > 0) {
        const current_data = current_table[0]
        if (current_data.first) {
          current_data.first = false
          current_data.starttime = performance.now()
          current_data.start_quaternion = current_object3D.quaternion.clone()
          current_data.end_quaternion = new THREE.Quaternion().setFromAxisAngle(rotvec_table[i], toRadian(current_data.rot))
          if (switchingVrMode) {
            current_data.move_time = 0
          } else {
            const move_time_1 = target_move_distance * target_move_speed
            const wk_euler = new THREE.Quaternion().angleTo(
              current_data.start_quaternion.clone().invert().multiply(current_data.end_quaternion))
            const move_time_2 = (toAngle(wk_euler) * max_move_unit[i]) * 1000
            current_data.move_time = Math.max(move_time_1, move_time_2)
          }
          current_data.endtime = current_data.starttime + current_data.move_time
        }
        const current_time = performance.now()
        if (current_time < current_data.endtime) {
          const elapsed_time = current_time - current_data.starttime
          current_object3D.quaternion.slerpQuaternions(
            current_data.start_quaternion, current_data.end_quaternion, (elapsed_time / current_data.move_time))
        } else {
          current_object3D.quaternion.copy(current_data.end_quaternion)
          current_table.shift()
        }
      }
    }
    if (raw_data > 0) {// アニメーションを続ける？
      //      console.log("Joint Slerp", raw_data)
      if (xrSession !== undefined) {
        xrSession.requestAnimationFrame(joint_slerp)
      } else {
        requestAnimationFrame(joint_slerp)
      }
      //setTimeout(()=>{joint_slerp()},0)
    } else {
      ToolChangeMove = false
      if (xrSession !== undefined) {
        xrSession.requestAnimationFrame(toolChangeExec)
      } else {
        requestAnimationFrame(toolChangeExec)
      }

      // ここいる？

      if (inputRotateFlg.current) {// 入力１回に１どだけ
        inputRotateFlg.current = false
//        console.log("before robot rotate ", outputRotateRef.current)
//        console.log("input rotate ", input_rotateRef.current)
//        console.log("current rotate ", input_rotateRef.current)
        set_outputRotate([...input_rotateRef.current])
        set_checkRotate([...input_rotateRef.current])
      }

    }
  }
  //}, [now])


  // どの箱のどこに接触しているか（prev は、衝突していた場合に動かさないため）
  const boxTouchCheck = (newtarget, prevtarget) => {
    const nt = structuredClone(newtarget) // offsetX を変更
    nt.x += vrModeOffsetX_ref.current     // 


    const objKeys = Object.keys(luggage_obj_list)
    if (objKeys.length > 0) {
      // 最も近いbox を探す
      const wk_carryLuggageKey = objKeys.reduce((prev, key) => {
        let res = prev
        if (prev === undefined) {
          res = key
        } else {
          const prevpos = new THREE.Vector3()
          luggage_obj_list[prev].getWorldPosition(prevpos)
          const prevdis = distance(prevpos, nt)
          const newpos = new THREE.Vector3()
          luggage_obj_list[key].getWorldPosition(newpos)
          const newdis = distance(newpos, nt)
          if (prevdis > newdis) {
            res = key
          }
        }
        return res
      }, undefined)

      // 表示用
      //      const tmppos = new THREE.Vector3()
      //      luggage_obj_list[wk_carryLuggageKey].getWorldPosition(tmppos)
      //      const newdis = Math.floor(distance(tmppos, nt) * 100) / 100;
      //      set_debug_message(`${wk_carryLuggageKey},t:(${round(nt.x)},${nt.z}),b(${tmppos.x},${tmppos.z}),d:${newdis}`)

      //    const newtargetV3 = new THREE.Vector3(newtarget.x, newtarget.y, newtarget.z)
      const newtargetV3 = new THREE.Vector3(nt.x, nt.y, nt.z)
      let original_pos = newtargetV3.clone()
      const boxObj = luggage_obj_list[wk_carryLuggageKey].clone()
      const wk_box_world_pos = new THREE.Vector3()
      boxObj.getWorldPosition(wk_box_world_pos)
      //console.log("wk_box_world_pos_",wk_box_world_pos)
      if (newtargetV3.equals(wk_box_world_pos)) {// raycast のためのcheck
        //console.log("touch same pos",wk_carryLuggageKey)
        const p15_16_offset_pos = get_p21_pos()
        original_pos = newtargetV3.clone().sub(p15_16_offset_pos)
      }
      const outdir = original_pos.clone().sub(wk_box_world_pos).normalize() //差分ベクトル
      const outpos = wk_box_world_pos.clone().add(outdir.multiplyScalar(1)) //１ｍ後方の座標を求めて raycast
      const dir = wk_box_world_pos.clone().sub(outpos).normalize()
      const raycaster = new THREE.Raycaster(outpos, dir)
      const intersects = raycaster.intersectObject(boxObj, true)
      if (intersects.length > 0) {
        let minValueIdx = 0
        for (let i = 0; i < intersects.length; i = i + 1) { //近い方の接点を探す
          if (intersects[i].distance < intersects[minValueIdx].distance) {
            minValueIdx = i
          }
        }
        const hit = intersects[minValueIdx]
        const Distance_surface_target = distance(hit.point, newtargetV3)
        if (Math.abs(Distance_surface_target) <= 0.0005) {  //表面から５ｍｍ以内
          console.log("touch0", wk_carryLuggageKey)
          const tp = newtargetV3
          tp.x -= vrModeOffsetX_ref.current
          return { result: true, touchPoint: { x: round(tp.x), y: round(tp.y), z: round(tp.z) }, key: wk_carryLuggageKey }
        } else {
          const Distance_center_surface = distance(wk_box_world_pos, hit.point)
          const Distance_center_terget = distance(wk_box_world_pos, newtargetV3)
          if (Distance_center_surface >= Distance_center_terget) {  //接触位置がターゲットより外側なら接触
            console.log("touch1", newtargetV3, prevtarget)
            //            const prevOffset = structuredClone(prevtarget) // offsetX を変更
            let tp = hit.point;
            if (touchLuggage !== undefined) {
              console.log("touch2", wk_carryLuggageKey, prevtarget)
              tp = prevtarget;
            } else {
              console.log("touch3", wk_carryLuggageKey, tp)
              // target は戻す必要がある
              tp.x -= vrModeOffsetX_ref.current
            }
            //            const tp = touchLuggage === undefined ? hit.point : prevOffset;//　（一つ前のターゲットで動かないようにする）
            return { result: true, touchPoint: { x: round(tp.x), y: round(tp.y), z: round(tp.z) }, key: wk_carryLuggageKey }
          } else {
            console.log("not touch ", wk_carryLuggageKey)
          }
        }
      } else {
        console.log("box size over!! 1m over")
      }
      return { result: false, key: wk_carryLuggageKey }
    }
    return { result: false, key: "NoBox" }
  }

  React.useEffect(() => {// グリップ変化時 , [gripRef.current, j7_rotate_ref.current])
    const objKeys = Object.keys(luggage_obj_list)
    if (objKeys.length > 0) {
      //      console.log("grip",gripRef.current,"j7_rotate",j7_rotate_ref.current, touchLuggage, carryLuggage)
      if (props.appmode === AppMode.practice) {
        if (gripRef.current || j7_rotate_ref.current > 0) {  //つかむ
          if (touchLuggage !== undefined && !carryLuggage) {
            //            console.log("catch", touchLuggage)
            carryLuggage = true
            const wk_box_world_pos = new THREE.Vector3()
            luggage_obj_list[touchLuggage].getWorldPosition(wk_box_world_pos)
            const wk_box_add_local_pos = endTool_obj.worldToLocal(wk_box_world_pos)
            luggage_obj_list[touchLuggage].position.copy(wk_box_add_local_pos)
            const wk_box_world_quat = new THREE.Quaternion()
            luggage_obj_list[touchLuggage].getWorldQuaternion(wk_box_world_quat)
            const quatDifference = quaternionDifference(wk_box_world_quat, get_j5_quaternion())
            luggage_obj_list[touchLuggage].quaternion.copy(quatDifference.invert())
            endTool_obj.add(luggage_obj_list[touchLuggage])
          }
        } else {  //はなす
          if (endTool_obj.children.includes(luggage_obj_list[touchLuggage]) && carryLuggage) {
            //            console.log("release", touchLuggage)
            carryLuggage = false
            const scene_object = document.querySelector('a-scene').object3D;
            const wk_box_world_pos = new THREE.Vector3()
            luggage_obj_list[touchLuggage].getWorldPosition(wk_box_world_pos)
            const wk_box_add_local_pos = scene_object.worldToLocal(wk_box_world_pos)
            luggage_obj_list[touchLuggage].position.copy(wk_box_add_local_pos)
            const wk_box_world_quat = new THREE.Quaternion()
            luggage_obj_list[touchLuggage].getWorldQuaternion(wk_box_world_quat)
            luggage_obj_list[touchLuggage].quaternion.copy(wk_box_world_quat)
            endTool_obj.remove(luggage_obj_list[touchLuggage])
            scene_object.add(luggage_obj_list[touchLuggage])
            // ここから落下アニメーションスタート
            fallingLuggage = touchLuggage; // 落下中の荷物を設定
            fallingSpeed = 0.02 // 落下速度を初期化
            touchLuggage = undefined

          }
        }
      }
    }
  }, [gripRef.current, j7_rotate_ref.current])

  React.useEffect(() => {
    rotate_table[0] = [{ rot: j1_rotate, first: true }]
  }, [j1_rotate])

  React.useEffect(() => {
    rotate_table[1] = [{ rot: j2_rotate, first: true }]
  }, [j2_rotate])

  React.useEffect(() => {
    rotate_table[2] = [{ rot: j3_rotate, first: true }]
  }, [j3_rotate])

  React.useEffect(() => {
    rotate_table[3] = [{ rot: j4_rotate, first: true }]
  }, [j4_rotate])

  React.useEffect(() => {
    rotate_table[4] = [{ rot: j5_rotate, first: true }]   
  }, [j5_rotate])

  React.useEffect(() => {
    rotate_table[5] = [{ rot: j6_rotate, first: true }]
  }, [j6_rotate])

  React.useEffect(() => {
    set_j6_rotate(round(normalize180(j6_rotate_org + tool_rotate)))
  }, [tool_rotate, j6_rotate_org])

  function shortestAngleDiffSigned(angle_1, angle_2) {
    const wk_angle_1 = normalize180(angle_1)
    const wk_angle_2 = normalize180(angle_2)
    let diff = (wk_angle_1 - wk_angle_2);
    // -180〜180度の範囲に正規化
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    if (Math.abs(diff) === 180) diff = 180;
    return diff; // プラスならaはbより反時計回り、マイナスなら時計回り
  }

  // 出力用に変換
  const outRotateConv = (rotate, prevRotate) => {
    const base_rot = [rotate.j1_rotate, rotate.j2_rotate, rotate.j3_rotate, rotate.j4_rotate, rotate.j5_rotate, rotate.j6_rotate]
    const Correct_value = [j1_Correct_value, j2_Correct_value, j3_Correct_value, j4_Correct_value, j5_Correct_value, j6_Correct_value]
    const check_value = [j1_limit, j2_limit, j3_limit, j4_limit, j5_limit, j6_limit]
    const new_rot = base_rot.map((base, idx) => normalize180(base + Correct_value[idx]))
    const diff = new_rot.map((rot, idx) => shortestAngleDiffSigned(rot, prevRotate[idx]))
    const result_rot = new_rot.map((rot, idx) => {
      const result_value = round(prevRotate[idx] + diff[idx])
      if (Math.abs(result_value) < 360) {
        let rtn_rot = rot
        if (result_value >= 180) {// このあたりが怪しい。。。
          rtn_rot = (rot + 360) % 360
        } else if (result_value <= -180) {
          rtn_rot = (rot - 360) % 360
        }
        return round(rtn_rot)
      }
      return round(result_value)
    })
    let error_info = undefined
    for (let i = 0; i < result_rot.length; i++) {
      if (Math.abs(result_rot[i]) > check_value[i]) {
        if (error_info === undefined) {
          error_info = [{ joint: i + 1, rotate: result_rot[i], check_value: check_value[i] }]
        } else {
          error_info.push({ joint: i + 1, rotate: result_rot[i], check_value: check_value[i] })
        }
      }
    }
    const ret =
    {
      j1_rotate: result_rot[0],
      j2_rotate: result_rot[1],
      j3_rotate: result_rot[2],
      j4_rotate: result_rot[3],
      j5_rotate: result_rot[4],
      j6_rotate: result_rot[5],
      error_info
    }
    return ret;
  }

  React.useEffect(() => {
    if (xrSession !== undefined) {
      xrSession.requestAnimationFrame(joint_slerp)
    } else {
      requestAnimationFrame(joint_slerp)
    }
    //setTimeout(()=>{joint_slerp()},0)

    if (props.appmode === AppMode.viewer) {
      const conv_result = outRotateConv(
        { j1_rotate, j2_rotate, j3_rotate, j4_rotate, j5_rotate, j6_rotate: normalize180(j6_rotate + tool_rotate) },
        [...outputRotateRef.current]
      )

      if (conv_result.error_info !== undefined) {
        const error_info = conv_result.error_info
        for (let i = 0; i < error_info.length; i++) {
          if (error_info[i].check_value >= 180) {
            console.log(`j${error_info[i].joint}_rotate`, error_info[i].rotate, normalize180(error_info[i].rotate))
            conv_result[`j${error_info[i].joint}_rotate`] = normalize180(error_info[i].rotate)
          } else {
            const check_rot = normalize180(error_info[i].rotate)
            if (Math.abs(check_rot) < error_info[i].check_value) {
              console.log(`j${error_info[i].joint}_rotate`, error_info[i].rotate, check_rot)
              conv_result[`j${error_info[i].joint}_rotate`] = check_rot
            }
          }
        }
      }

      const new_rotate = [
        conv_result.j1_rotate,
        conv_result.j2_rotate,
        conv_result.j3_rotate,
        conv_result.j4_rotate,
        conv_result.j5_rotate,
        conv_result.j6_rotate,
        round(j7_rotate)
      ]
      set_outputRotate([...new_rotate])
      //outputRotateRef.current = [...new_rotate]
      //console.log("Real Rotate:",new_rotate)
    }
  }, [j1_rotate, j2_rotate, j3_rotate, j4_rotate, j5_rotate, j6_rotate, j7_rotate])

  React.useEffect(() => {
    if (input_rotate[0] === undefined) return
    const robot_rotate = {
      j1_rotate: round(normalize180(input_rotate[0] - j1_Correct_value)),
      j2_rotate: round(normalize180(input_rotate[1] - j2_Correct_value)),
      j3_rotate: round(normalize180(input_rotate[2] - j3_Correct_value)),
      j4_rotate: round(normalize180(input_rotate[3] - j4_Correct_value)),
      j5_rotate: round(normalize180(input_rotate[4] - j5_Correct_value)),
      j6_rotate: round(normalize180(input_rotate[5] - j6_Correct_value))
    }

    //    console.log("rec_joints", robot_rotate)// これはVR側の offset 無しの角度
    //console.log("j3_rotate",input_rotate[2])
    const { target_pos, wrist_euler } = getReaultPosRot(robot_rotate) // これで target_pos が計算される
    //    console.log("end getReal", target_pos, wrist_euler)

    //    console.log("Input -> Target Pose",target_pos)
    set_wrist_rot_org({ x: round(toAngle(wrist_euler.x)), y: round(toAngle(wrist_euler.y)), z: round(toAngle(wrist_euler.z)) }) // 手首の相対
    set_target_org((vr) => {
      target_move_distance = distance({ x: vr.x, y: vr.y, z: vr.z }, { x: target_pos.x, y: target_pos.y, z: target_pos.z }) // 位置の差分を計算
      // あまりに 変化が大きいときどうする？
      vr.x = round(target_pos.x); vr.y = round(target_pos.y); vr.z = round(target_pos.z);
      return vr
    }); // これだと場所だけ (手首の相対もやるべし！)
    set_j7_rotate(input_rotate[6]) // 指用

  }, [input_rotate[0], input_rotate[1], input_rotate[2], input_rotate[3], input_rotate[4], input_rotate[5], input_rotate[6]])

  const get_j5_quaternion = (rot_x = wrist_rot.x, rot_y = wrist_rot.y, rot_z = wrist_rot.z) => {
    return new THREE.Quaternion().setFromEuler(
      new THREE.Euler(toRadian(rot_x), toRadian(rot_y), toRadian(rot_z), order)
    )
  }

  const get_p21_pos = () => {
    const j5q = get_j5_quaternion()
    const p21_pos = quaternionToRotation(j5q, { x: 0, y: 0, z: p15_16_len })
    return p21_pos
  }

  React.useEffect(() => {
    if (rendered) {
      //      console.log("Do target update", target)
      target_update()
      if (p51_object) p51_object.quaternion.copy(get_j5_quaternion())
    }
  }, [do_target_update])

  // MetaworkMQTT protocol

  // MQTT connected request
  const requestRobot = (mqclient) => {
    // 制御対象のロボットを探索（表示された時点で実施）
    if (props.appmode === AppMode.viewer) {
      return;
    }
    const requestInfo = {
      devId: idtopic, // 自分のID
      type: codeType,  //  コードタイプ（Request でマッチングに利用)
    }
    console.log("Publish request", requestInfo)
    publishMQTT(MQTT_REQUEST_TOPIC, JSON.stringify(requestInfo));
  }

  // register to MQTT
  React.useEffect(() => {
    if (typeof window.mqttClient === 'undefined') {
      if (props.appmode === AppMode.practice) { // 練習モードは　MQTT 接続しない
        return;
      }
      //サブスクライブするトピックの登録
      //      console.log("Start connectMQTT!!")
      if (mqttclient != null) {
        window.mqttClient = mqttclient;
        subscribeMQTT([
          MQTT_DEVICE_TOPIC
        ]);
        requestRobot(mqttclient);
      } else {
        window.mqttClient = connectMQTT(requestRobot);
        subscribeMQTT([
          MQTT_DEVICE_TOPIC
        ]);
      }
      //      console.log("Subscribe:",MQTT_DEVICE_TOPIC);
      //        MQTT_CTRL_TOPIC  // MQTT Version5 なので、 noLocal が効くはず

      if (props.appmode === AppMode.viewer) {// Viewer の場合
        //サブスクライブ時の処理
        window.mqttClient.on('message', (topic, message) => {
          if (topic === MQTT_DEVICE_TOPIC) { // デバイスへの連絡用トピック
            console.log(" MQTT Device Topic: ", message.toString());
            // ここでは Viewer の設定を実施！
            let data = JSON.parse(message.toString())
            if (data.controller !== undefined) {// コントローラ情報ならば！
              robotIDRef.current = data.devId
              subscribeMQTT([
                "control/" + data.devId
              ]);
            }
          } else if (topic === "control/" + robotIDRef.current) {
            let data = JSON.parse(message.toString())
            if (data.joints !== undefined) {
              // 次のフレームあとにtarget を確認してもらう（IKが出来てるはず
              if (!viewer_tool_change && !viewer_put_down_box) {
                if (input_rotateRef.current.some((e, i) => e !== data.joints[i])) {
                  console.log("Viewer!!!", data.joints)
                  set_input_rotate([...data.joints])
                  inputRotateFlg.current = true
                }
                if (data.tool_change !== undefined) {
                  console.log("tool_change!", data.tool_change)
                  viewer_tool_change = true;
                  toolChange1()
                  setTimeout(() => {
                    set_toolName(tool_menu_list[convertInt(data.tool_change) - 1])
                  }, 10000)
                  setTimeout(() => {
                    //viewer_tool_change_end = true
                    //viewer_tool_change = false
                  }, 20000)
                }
                if (data.put_down_box !== undefined) {
                  console.log("put_down_box!", data.put_down_box)
                  viewer_put_down_box = true;
                  setTimeout(() => {
                    // put_down_box 終了通知
                    viewer_put_down_box_end = true
                    viewer_put_down_box = false
                  }, 20000)
                }
              }
            }
          }
        })
      } else { // not viewer
        //自分向けメッセージサブスクライブ処理
        window.mqttClient.on('message', (topic, message) => {
          if (topic === MQTT_DEVICE_TOPIC) { // デバイスへの連絡用トピック
            let data = JSON.parse(message.toString())
            console.log(" MQTT Device Topic: ", message.toString());
            if (data.devId === "none") {
              console.log("Can't find robot!")
            } else {
              console.log("Assigned robot:", data.devId)
              robotIDRef.current = data.devId
              if (receive_state === false) { // ロボットの姿勢を受け取るまで、スタートしない。
                subscribeMQTT([
                  MQTT_ROBOT_STATE_TOPIC + robotIDRef.current // ロボットの姿勢を待つ
                ])
              }
            }
          }
          if (topic === MQTT_ROBOT_STATE_TOPIC + robotIDRef.current) { // ロボットの姿勢を受け取ったら
            let data = JSON.parse(message.toString()) ///
            const joints = data.joints
            // ここで、joints の安全チェックをすべき
            // 常時受信する形に変更されたので　Unsubscribeしない

            //mqttclient.unsubscribe(MQTT_ROBOT_STATE_TOPIC+robotIDRef.current) //
            if (firstReceiveJoint || tool_load_operation || put_down_box_operation || line_cut_operation) {
              if (data.tool_id !== undefined) {
                const tool_id = convertInt(data.tool_id)
                if (tool_id >= 1 && tool_id <= tool_menu_list.length) {
                  const tool_name = tool_menu_list[tool_id - 1]
                  if (toolNameRef.current !== tool_name) {
                    console.log("receive tool_id!", tool_name, data.tool_id)
                    set_toolName(tool_name)
                  }
                }
              }
              if (tool_load_operation && data.tool_change !== undefined && data.tool_change === true) {
                console.log("receive tool_change!", data.tool_change)
                clearTimeout(tool_load_timeout_id)
                tool_load_operation = false
                vrControllEnd()
                if (trigger_on) {
                  vrControllStart()
                }
                set_update((v) => v = v + 1)
              }
              // 東邦用のパレット箱を下す
              if (put_down_box_operation && data.put_down_box !== undefined) {
                console.log("receive put_down_box!", data.put_down_box)
                clearTimeout(put_down_box_timeout_id)
                put_down_box_operation = false
                vrControllEnd()
                if (trigger_on) {
                  vrControllStart()
                }
                set_update((v) => v = v + 1)
              }

              // カット用の状態取得
              if (line_cut_operation && data.line_cut !== undefined) {
                console.log("receive line_cut!", data.line_cut)
                clearTimeout(line_cut_timeout_id)
                line_cut_operation = false
                vrControllEnd()
                if (trigger_on) {
                  vrControllStart()
                }
                set_update((v) => v = v + 1)
              }

              // ここで、ジョイントから target を逆計算する（ツールによって変化すべし）
              if (firstReceiveJoint || tool_load_operation || put_down_box_operation || line_cut_operation) {
                if (input_rotateRef.current.some((e, i) => e !== joints[i])) {
                  //                  console.log("receive joints from:", robotIDRef.current, joints)
                  set_input_rotate([...joints])

                  inputRotateFlg.current = true
                }
              }
            }

            if (firstReceiveJoint) {

              if (props.appmode !== AppMode.monitor) {
                firstReceiveJoint = false
                window.setTimeout(() => {
                  console.log("Start to send movement!")
                  set_debug_message("Receive + go!")
                  receive_state = true; //
                  // ロボットに指令元を伝える
                  publishMQTT("dev/" + robotIDRef.current, JSON.stringify({ controller: "browser", devId: idtopic })) // 自分の topic を教える
                }, 1000);
              }else{// monitor の時、このきっかけがないので、動かなかった。。。
                  //console.log(joints)
                  set_debug_message("monitor start")
              }
            }
          }

        })
      }
    }
    // 消える前にイベントを呼びたい
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [])

  const handleBeforeUnload = () => {
    if (mqttclient !== undefined) {
      publishMQTT("mgr/unregister", JSON.stringify({ devId: idtopic }));
    }
  }

  // Vector v をクオータニオンで回転させる
  const quaternionToRotation = (q, v) => {
    const q_original = new THREE.Quaternion().copy(q)
    const q_conjugate = q_original.clone().conjugate()
    const q_vector = new THREE.Quaternion(v.x, v.y, v.z, 0)
    const result = q_original.multiply(q_vector).multiply(q_conjugate)
    return new THREE.Vector3((result.x), (result.y), (result.z))
  }

  /* old 
  const quaternionToAngle = (q) => {
    const radian = 2 * Math.acos(round(q.w))
    if (radian === 0) {
      return { angle: (toAngle(radian)), radian, axis: new THREE.Vector3(0, 0, 0) }
    }
    const angle = (toAngle(radian))
    const sinHalfAngle = Math.sqrt(1 - q.w * q.w)
    if (sinHalfAngle > 0) {
      const axisX = (q.x / sinHalfAngle)
      const axisY = (q.y / sinHalfAngle)
      const axisZ = (q.z / sinHalfAngle)
      return { angle, radian, axis: new THREE.Vector3(axisX, axisY, axisZ) }
    } else {
      return { angle, radian, axis: new THREE.Vector3(0, 0, 0) }
    }
  }
    */

  function quaternionToAngle(q) {
    const qn = q.clone().normalize(); // 念のため正規化
    const w = THREE.MathUtils.clamp(qn.w, -1, 1); // 丸めではなく clamp
    let theta = 2 * Math.acos(w);                 // [0, π] になるはず
    const s = Math.sqrt(Math.max(0, 1 - w * w));    // 数値誤差ガード

    let axis;
    if (s < 1e-8 || theta < 1e-8) {
      // 角度ほぼゼロ→軸は任意（可視化用途なら前回軸を使う等も可）
      theta = 0;
      axis = new THREE.Vector3(1, 0, 0);
    } else {
      axis = new THREE.Vector3(qn.x / s, qn.y / s, qn.z / s);
    }

    // 角度>π を避けたい場合の正規化（任意）
    if (theta > Math.PI) { theta = 2 * Math.PI - theta; axis.negate(); }

    return {
      angle: THREE.MathUtils.radToDeg(theta),
      radian: theta,
      axis
    };
  }


  function quaternionToAngleXZ(q) {
    const qn = q.clone().normalize(); // 念のため正規化
    const w = THREE.MathUtils.clamp(qn.w, -1, 1); // 丸めではなく clamp
    let theta = 2 * Math.acos(w);                 // [0, π] になるはず
    const s = Math.sqrt(Math.max(0, 1 - w * w));    // 数値誤差ガード

    let axis;
    if (s < 1e-8 || theta < 1e-8) {
      // 角度ほぼゼロ→軸は任意（可視化用途なら前回軸を使う等も可）
      theta = 0;
      axis = new THREE.Vector3(1, 0, 0);
    } else {
      axis = new THREE.Vector3(qn.z / s, qn.y / s, qn.x / s); // xz を入れ替え？
    }

    // 角度>π を避けたい場合の正規化（任意）
    if (theta > Math.PI) { theta = 2 * Math.PI - theta; axis.negate(); }

    return {
      angle: THREE.MathUtils.radToDeg(theta),
      radian: theta,
      axis
    };
  }




  const quaternionDifference = (q1, q2) => {
    return new THREE.Quaternion(q1.x, q1.y, q1.z, q1.w).invert().multiply(
      new THREE.Quaternion(q2.x, q2.y, q2.z, q2.w)
    )
  }

  const direction_angle = (vec) => {
    const dir_sign1 = vec.x < 0 ? -1 : 1
    const xz_vector = new THREE.Vector3(vec.x, 0, vec.z).normalize()
    const direction = (toAngle(Math.acos(xz_vector.dot(z_vec_base)))) * dir_sign1
    const y_vector = new THREE.Vector3(vec.x, vec.y, vec.z).normalize()
    const angle = (toAngle(Math.acos(y_vector.dot(y_vec_base))))
    return { direction, angle }
  }

  const convertInt = (x) => {
    const parsed = Number.parseInt(x, 10);
    if (Number.isNaN(parsed)) {
      return 0;
    }
    return parsed;
  }

  const pos_add = (pos1, pos2) => {
    return { x: (pos1.x + pos2.x), y: (pos1.y + pos2.y), z: (pos1.z + pos2.z) }
  }

  const pos_sub = (pos1, pos2) => {
    return { x: (pos1.x - pos2.x), y: (pos1.y - pos2.y), z: (pos1.z - pos2.z) }
  }

  const degree3 = (side_a, side_b, side_c) => {
    const angle_A = (toAngle(Math.acos((side_b ** 2 + side_c ** 2 - side_a ** 2) / (2 * side_b * side_c))))
    const angle_B = (toAngle(Math.acos((side_a ** 2 + side_c ** 2 - side_b ** 2) / (2 * side_a * side_c))))
    const angle_C = (toAngle(Math.acos((side_a ** 2 + side_b ** 2 - side_c ** 2) / (2 * side_a * side_b))))
    return { angle_A, angle_B, angle_C }
  }

  React.useEffect(() => {
    if (rendered) {
      set_do_target_update((prev) => prev + 1) // increment the counter to trigger target_update

      set_test_pos({ ...target })

      // target が変更されたら、 disp_target も変更
      const disp_target_pos = new THREE.Vector3().applyMatrix4(
        new THREE.Matrix4().multiply(
          new THREE.Matrix4().makeRotationY(toRadian(vrModeAngle_ref.current))
        ).multiply(
          //          new THREE.Matrix4().setPosition(target_ref.current.x, target_ref.current.y, target_ref.current.z)
          new THREE.Matrix4().setPosition(target.x, target.y, target.z)
        )
      );
      // ターゲットを変えちゃいけない（仮想ターゲットをだすべき！）
      set_disp_target((vr) => {
        vr.x = round(disp_target_pos.x); vr.y = round(disp_target_pos.y); vr.z = round(disp_target_pos.z);
        return vr
      })
    }
  }, [target.x, target.y, target.z, tool_rotate, rendered, wrist_rot.x, wrist_rot.y, wrist_rot.z, p15_16_len])

  const target_update = () => {
    const p21_pos = get_p21_pos()
    const { direction, angle } = direction_angle(p21_pos)
    if (isNaN(direction)) {
      console.log("p21_pos 指定可能範囲外！")
      set_dsp_message("p21_pos 指定可能範囲外！")
      return
    }
    if (isNaN(angle)) {
      console.log("p21_pos 指定可能範囲外！")
      set_dsp_message("p21_pos 指定可能範囲外！")
      return
    }
    set_wrist_degree({ direction, angle })// 表示用

    target15_update(direction, angle)
  }


  // 各ジョイント各で Forward Kinematics
  // Tool の影響をちゃんと入れてないよね！
  function getReaultPosRot(all_joint_rot) {
    //console.log("getReaultPosRot")
    const { j1_rotate, j2_rotate, j3_rotate, j4_rotate, j5_rotate, j6_rotate } = all_joint_rot
    const new_m4 = new THREE.Matrix4().multiply(
      new THREE.Matrix4().makeRotationY(toRadian(j1_rotate)).setPosition(joint_pos.j1.x, joint_pos.j1.y, joint_pos.j1.z)
    ).multiply(
      new THREE.Matrix4().makeRotationX(toRadian(j2_rotate)).setPosition(joint_pos.j2.x, joint_pos.j2.y, joint_pos.j2.z)
    ).multiply(
      new THREE.Matrix4().makeRotationX(toRadian(j3_rotate)).setPosition(joint_pos.j3.x, joint_pos.j3.y, joint_pos.j3.z)
    ).multiply(
      new THREE.Matrix4().makeRotationY(toRadian(j4_rotate)).setPosition(joint_pos.j4.x, joint_pos.j4.y, joint_pos.j4.z)
    ).multiply(
      new THREE.Matrix4().makeRotationX(toRadian(j5_rotate)).setPosition(joint_pos.j5.x, joint_pos.j5.y, joint_pos.j5.z)
    ).multiply(
      new THREE.Matrix4().makeRotationZ(toRadian(j6_rotate)).setPosition(joint_pos.j6.x, joint_pos.j6.y, joint_pos.j6.z)
    ).multiply(
      // ここが、 Tool の影響を受ける
      new THREE.Matrix4().setPosition(joint_pos.j7.x, joint_pos.j7.y, p15_16_len)
    )


    const target_pos = new THREE.Vector3().applyMatrix4(new_m4)
    const wrist_euler = new THREE.Euler().setFromRotationMatrix(new_m4, order)
    //    console.log("Calc:",target_pos)
    return { target_pos, wrist_euler }
  }

  const target15_update = (wrist_direction, wrist_angle) => {
    let dsp_message = "ターゲット追従不可！"
    const shift_target = { ...target }
    let save_target = { ...target }
    let result_rotate = { j1_rotate, j2_rotate, j3_rotate, j4_rotate, j5_rotate, j6_rotate, dsp_message }
    let save_distance = undefined
    let save_distance_cnt = 0
    let save_rotate = { ...result_rotate }
    j1_error = false
    j2_error = false
    j3_error = false
    j4_error = false
    j5_error = false
    j6_error = false

    for (let i = 0; i < 10; i = i + 1) {
      result_rotate = get_all_rotate(shift_target, wrist_direction, wrist_angle)
      if (result_rotate.dsp_message) {
        dsp_message = result_rotate.dsp_message
        console.log(dsp_message)
        set_target_error(true)
      }

      const wk_result = getReaultPosRot(result_rotate)
      const wk_target = wk_result.target_pos
      const result_target = { x: round(wk_target.x), y: round(wk_target.y), z: round(wk_target.z) }
      const sabun_pos = pos_sub(target, result_target)
      const sabun_distance = sabun_pos.x ** 2 + sabun_pos.y ** 2 + sabun_pos.z ** 2
      const wk_euler = wk_result.wrist_euler
      const sabun_angle = get_j5_quaternion().angleTo(new THREE.Quaternion().setFromEuler(wk_euler))
      if (round(sabun_distance) <= 0 && round(sabun_angle, 2) <= 0) {
        save_target = { ...result_target }
        dsp_message = ""
        break
      }
      if (save_distance === undefined) {
        save_distance = sabun_distance
      } else {
        if (save_distance < sabun_distance) {
          save_distance_cnt = save_distance_cnt + 1
          if (save_distance_cnt > 1) {
            if (round(sabun_distance, 4) <= 0) {
              result_rotate = { ...save_rotate }
              console.log("姿勢制御困難！")
              save_target = { ...result_target }
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
        save_rotate = { ...result_rotate }
      }
      shift_target.x = shift_target.x + sabun_pos.x
      shift_target.y = shift_target.y + sabun_pos.y
      shift_target.z = shift_target.z + sabun_pos.z
    }

    if (dsp_message === "" && !(props.appmode === AppMode.viewer) && !inputRotateFlg.current) {
      const check_result = outRotateConv(result_rotate, [...checkRotateRef.current])
      if (check_result.j1_rotate < -j1_limit || check_result.j1_rotate > j1_limit) {
        dsp_message = `j1_rotate 指定可能範囲外！:(${check_result.j1_rotate})`
        j1_error = true
      }
      if (check_result.j2_rotate < -j2_limit || check_result.j2_rotate > j2_limit) {
        dsp_message = `j2_rotate 指定可能範囲外！:(${check_result.j2_rotate})`
        j2_error = true
      }
      if (check_result.j3_rotate < -j3_limit || check_result.j3_rotate > j3_limit) {
        dsp_message = `j3_rotate 指定可能範囲外！:(${check_result.j3_rotate})`
        j3_error = true
      }
      if (check_result.j4_rotate < -j4_limit || check_result.j4_rotate > j4_limit) {
        dsp_message = `j4_rotate 指定可能範囲外！:(${check_result.j4_rotate})`
        j4_error = true
      }
      if (check_result.j5_rotate < -j5_limit || check_result.j5_rotate > j5_limit) {
        dsp_message = `j5_rotate 指定可能範囲外！:(${check_result.j5_rotate})`
        j5_error = true
      }
      if (check_result.j6_rotate < -j6_limit || check_result.j6_rotate > j6_limit) {
        dsp_message = `j6_rotate 指定可能範囲外！:(${check_result.j6_rotate})`
        j6_error = true
      }
      if (dsp_message === "") {
        const check_rotate = [
          check_result.j1_rotate,
          check_result.j2_rotate,
          check_result.j3_rotate,
          check_result.j4_rotate,
          check_result.j5_rotate,
          check_result.j6_rotate,
          checkRotateRef.current[6]
        ]
        set_checkRotate(check_rotate)
      }
    }

    if (dsp_message === "") {
      set_target_error(false)
      set_j1_rotate(round(result_rotate.j1_rotate))
      set_j2_rotate(round(result_rotate.j2_rotate))
      set_j3_rotate(round(result_rotate.j3_rotate))
      set_j4_rotate(round(result_rotate.j4_rotate))
      set_j5_rotate(round(result_rotate.j5_rotate))
      set_j6_rotate_org(round(result_rotate.j6_rotate))
      //set_j6_rotate(round(normalize180(result_rotate.j6_rotate + tool_rotate)))
      real_target = { ...save_target }
    } else {
      set_target_error(true)
    }
    set_dsp_message(dsp_message)
  }

  // ここが IK のメイン？
  const get_all_rotate = (final_target, wrist_direction, wrist_angle) => {
    let dsp_message = ""
    const p16_pos = new THREE.Vector3(final_target.x, final_target.y, final_target.z)
    const p15_16_offset_pos = get_p21_pos()
    const p15_pos_wk = pos_sub(p16_pos, p15_16_offset_pos)
    const p15_pos = new THREE.Vector3(p15_pos_wk.x, p15_pos_wk.y, p15_pos_wk.z)

    const syahen_t15 = (distance({ x: 0, y: joint_pos.j2.y, z: 0 }, p15_pos))
    const takasa_t15 = (p15_pos.y - joint_pos.j2.y)
    const { k: angle_t15 } = calc_side_4(syahen_t15, takasa_t15)
    const result_t15 = get_J2_J3_rotate(angle_t15, joint_pos.j3.y, joint_pos.j4.y, syahen_t15)
    if (result_t15.dsp_message) {
      dsp_message = result_t15.dsp_message
      return { j1_rotate, j2_rotate, j3_rotate, j4_rotate, j5_rotate, j6_rotate, dsp_message }
    }
    const wk_j2_rotate = result_t15.j2_rotate
    const wk_j3_rotate = result_t15.j3_rotate

    const dir_sign_t15 = p15_pos.x < 0 ? -1 : 1
    const xz_vector_t15 = new THREE.Vector3(p15_pos.x, 0, p15_pos.z).normalize()
    const direction_t15 = (toAngle(z_vec_base.angleTo(xz_vector_t15)))
    if (isNaN(direction_t15)) {
      dsp_message = "direction_t15 指定可能範囲外！"
      return { j1_rotate, j2_rotate: wk_j2_rotate, j3_rotate: wk_j3_rotate, j4_rotate, j5_rotate, j6_rotate, dsp_message }
    }
    const wk_syahen = distance({ x: 0, y: 0, z: 0 }, { x: p15_pos.x, y: 0, z: p15_pos.z })
    const wk_kakudo = calc_side_4(wk_syahen, joint_pos.j4.x).k

    let wk_j1_rotate = normalize180(direction_t15 * dir_sign_t15) - (90 - wk_kakudo)
    if (isNaN(wk_j1_rotate)) {
      dsp_message = "wk_j1_rotate 指定可能範囲外！"
      return { j1_rotate, j2_rotate: wk_j2_rotate, j3_rotate: wk_j3_rotate, j4_rotate, j5_rotate, j6_rotate, dsp_message }
    }

    const baseq = new THREE.Quaternion().multiply(
      new THREE.Quaternion().setFromAxisAngle(y_vec_base, toRadian(wk_j1_rotate))
    ).multiply(
      new THREE.Quaternion().setFromAxisAngle(x_vec_base, toRadian(wk_j2_rotate))
    ).multiply(
      new THREE.Quaternion().setFromAxisAngle(x_vec_base, toRadian(wk_j3_rotate))
    )
    const p14_offset_pos = quaternionToRotation(baseq, { x: 0, y: joint_pos.j4.y, z: 0 })
    const p13_pos = pos_sub(p15_pos, p14_offset_pos)

    const distance_13_16 = (distance(p13_pos, p16_pos))
    const result_angle1 = degree3(joint_pos.j4.y, p15_16_len, distance_13_16)
    if (isNaN(result_angle1.angle_C)) {
      dsp_message = "result_angle1.angle_C 指定可能範囲外！"
      return {
        j1_rotate: wk_j1_rotate, j2_rotate: wk_j2_rotate, j3_rotate: wk_j3_rotate,
        j4_rotate, j5_rotate, j6_rotate, dsp_message
      }
    }
    const wk_j5_rotate = normalize180((180 - result_angle1.angle_C - 90))

    const result_p16_zero_offset = calc_side_1(p15_16_len, normalize180((180 - result_angle1.angle_C)))
    const p16_zero_offset_pos = quaternionToRotation(baseq, { x: 0, y: result_p16_zero_offset.a, z: result_p16_zero_offset.b })
    const p16_zero_pos = pos_add(p15_pos, p16_zero_offset_pos)
    const distance_16_16 = Math.min((distance(p16_zero_pos, p16_pos)), result_p16_zero_offset.b * 2)
    const result_angle2 = degree3(result_p16_zero_offset.b, result_p16_zero_offset.b, distance_16_16)
    if (isNaN(result_angle2.angle_C)) {
      dsp_message = "result_angle2.angle_C 指定可能範囲外！"
      return {
        j1_rotate: wk_j1_rotate, j2_rotate: wk_j2_rotate, j3_rotate: wk_j3_rotate,
        j4_rotate, j5_rotate: wk_j5_rotate, j6_rotate, dsp_message
      }
    }
    const direction_offset = normalize180(wrist_direction - wk_j1_rotate)
    const wk_j4_rotate = normalize180((result_angle2.angle_C * (direction_offset < 0 ? -1 : 1)))

    baseq.multiply(
      new THREE.Quaternion().setFromAxisAngle(y_vec_base, toRadian(wk_j4_rotate))
    ).multiply(
      new THREE.Quaternion().setFromAxisAngle(x_vec_base, toRadian(wk_j5_rotate))
    )
    const j5q = get_j5_quaternion()
    const p14_j5_diff = quaternionToAngle(quaternionDifference(baseq, j5q))
    const wk_j6_rotate = p14_j5_diff.angle * ((p14_j5_diff.axis.z < 0) ? -1 : 1)

    return {
      j1_rotate: wk_j1_rotate, j2_rotate: wk_j2_rotate, j3_rotate: wk_j3_rotate,
      j4_rotate: wk_j4_rotate, j5_rotate: wk_j5_rotate, j6_rotate: wk_j6_rotate, dsp_message
    }
  }

  const get_J2_J3_rotate = (angle_base, side_a, side_b, side_c) => {
    let dsp_message = undefined
    const max_dis = side_a + side_b
    const min_dis = Math.abs(side_a - side_b)

    let wk_j2_rotate = 0
    let wk_j3_rotate = 0
    if (min_dis > side_c) {
      wk_j2_rotate = angle_base
      wk_j3_rotate = 180
    } else
      if (side_c >= max_dis) {
        wk_j2_rotate = angle_base
        wk_j3_rotate = 0
      } else {
        let angle_B = toAngle(Math.acos((side_a ** 2 + side_c ** 2 - side_b ** 2) / (2 * side_a * side_c)))
        let angle_C = toAngle(Math.acos((side_a ** 2 + side_b ** 2 - side_c ** 2) / (2 * side_a * side_b)))

        if (isNaN(angle_B)) angle_B = 0
        if (isNaN(angle_C)) angle_C = 0

        const angle_j2 = normalize180((angle_base - angle_B))
        const angle_j3 = normalize180((angle_C === 0 ? 0 : 180 - angle_C))
        if (isNaN(angle_j2)) {
          console.log("angle_j2 指定可能範囲外！")
          dsp_message = "angle_j2 指定可能範囲外！"
          wk_j2_rotate = j2_rotate
        } else {
          wk_j2_rotate = angle_j2
        }
        if (isNaN(angle_j3)) {
          console.log("angle_j3 指定可能範囲外！")
          dsp_message = "angle_j3 指定可能範囲外！"
          wk_j3_rotate = j3_rotate
        } else {
          wk_j3_rotate = angle_j3
        }
      }
    const j4_sabun = calc_side_2(-joint_pos.j4.z, joint_pos.j4.y)
    wk_j3_rotate = wk_j3_rotate + j4_sabun.k
    return { j2_rotate: wk_j2_rotate, j3_rotate: wk_j3_rotate, dsp_message }
  }

  // 表示の時だけで良いのになぜ？
  const round = (x, d = 5) => {
    const v = 10 ** (d | 0)
    return Math.round(x * v) / v
  }

  const normalize180 = (angle) => {
    if (Math.abs(angle) === 180) {
      return angle
    }
    return ((angle + 180) % 360 + 360) % 360 - 180
  }

  const clip270 = (angle) => {
    if (angle > 270) return 270;
    if (angle < -270) return -270;
    return angle;
  }

  const toAngle = (radian) => {
    return normalize180(radian * (180 / Math.PI))
  }

  const toRadian = (angle) => {
    return normalize180(angle) * (Math.PI / 180)
  }

  const getposq = (parts_obj) => {
    const mat = parts_obj.matrixWorld
    let position = new THREE.Vector3();
    let quaternion = new THREE.Quaternion();
    let scale = new THREE.Vector3()
    mat.decompose(position, quaternion, scale)
    return { position, quaternion, scale }
  }

  const getpos = (position) => {
    const wkpos = { x: (position.x), y: (position.y), z: (position.z) }
    return wkpos
  }

  const distance = (s_pos, t_pos) => {
    return (Math.sqrt((t_pos.x - s_pos.x) ** 2 + (t_pos.y - s_pos.y) ** 2 + (t_pos.z - s_pos.z) ** 2))
  }

  const calc_side_1 = (syahen, kakudo) => {
    const teihen = (Math.abs(kakudo) === 90 ? 0 : (syahen * Math.cos(toRadian(kakudo))))
    const takasa = (Math.abs(kakudo) === 180 ? 0 : (syahen * Math.sin(toRadian(kakudo))))
    return { a: teihen, b: takasa }
  }

  const calc_side_2 = (teihen, takasa) => {
    const syahen = (Math.sqrt(teihen ** 2 + takasa ** 2))
    const kakudo = (toAngle(Math.atan2(teihen, takasa)))
    return { s: syahen, k: kakudo }
  }

  const calc_side_4 = (syahen, teihen) => {
    const wk_rad = Math.acos(teihen / syahen)
    const takasa = (teihen * Math.tan(wk_rad))
    const kakudo = (toAngle(wk_rad))
    return { k: kakudo, t: takasa }
  }

  // ここで大きさ変更を進めている！
  React.useEffect(() => {
    if (rendered) {
      const p15_pos = new THREE.Vector3().applyMatrix4(p15_object.matrix)
      const p16_pos = new THREE.Vector3().applyMatrix4(p16_object.matrix)
      const dist = distance(p15_pos, p16_pos)
      console.log("p15_16 distance", dist)
      set_p15_16_len(dist)
    }
  }, [tool_diff, p16_object.matrix.elements[14]])

  const vrControllStart = () => {
    controller_start_quat.copy(controller_object.quaternion.clone())
    controller_progress_quat.copy(controller_object.quaternion.clone())
    controller_acc_quat.identity()
    const wk_start_pos = new THREE.Vector3().applyMatrix4(controller_object.matrix)
    set_start_pos(wk_start_pos) // Trigger を押した瞬間の matrix を保存
  }

  const vrControllEnd = () => {

    const wrist_qua = new THREE.Quaternion().setFromAxisAngle(
      y_vec_base, toRadian(vrModeAngle_ref.current)
    ).multiply(
      new THREE.Quaternion().setFromEuler(
        new THREE.Euler(
          toRadian(wrist_rot_ref.current.x),
          toRadian(wrist_rot_ref.current.y),
          toRadian(wrist_rot_ref.current.z), order
        )
      )
    )
    const wrist_euler = new THREE.Euler().setFromQuaternion(wrist_qua, order)
    //            set_wrist_rot({ x: round(toAngle(wrist_euler.x)), y: round(toAngle(wrist_euler.y)), z: round(toAngle(wrist_euler.z)) })

    const vrcon_qua = wrist_qua.clone().multiply(
      new THREE.Quaternion().setFromEuler(
        new THREE.Euler(
          (0.6654549523360951 * -1),  //x
          Math.PI,  //y
          Math.PI,  //z
          order
        )
      ).invert()
    )

    robot_save_quat.copy(vrcon_qua)
    set_save_target(undefined)
  }

  React.useEffect(() => {
    if (!registered) {
      registered = true
      setTimeout(() => {
        set_rendered(true)
        console.log('set_rendered')
        add_debug_message("set_rendered")// ここ追加で可視化された！
      }, 200)

      const teihen = joint_pos.j5.x
      const takasa = joint_pos.j3.y + joint_pos.j4.y
      const result = calc_side_2(teihen, takasa)
      set_p14_maxlen(result.s)

      AFRAME.registerComponent('j_id', {
        schema: { type: 'number', default: undefined },
        init: function () {
          if (this.data === 0) { // base object は j_id 0 のオブジェクト。
            baseObject3D = this.el.object3D
            baseObject3D.rotation.set(0, toRadian(vrModeAngle), 0)
          } else
            if (this.data === 1) {
              object3D_table[0] = this.el.object3D
            } else
              if (this.data === 2) {
                object3D_table[1] = this.el.object3D
              } else
                if (this.data === 3) {
                  object3D_table[2] = this.el.object3D
                } else
                  if (this.data === 4) {
                    object3D_table[3] = this.el.object3D
                  } else
                    if (this.data === 5) {
                      object3D_table[4] = this.el.object3D
                    } else
                      if (this.data === 6) {
                        object3D_table[5] = this.el.object3D
                      } else
                        if (this.data === 11) {
                          //set_p11_object(this.el.object3D)
                        } else
                          if (this.data === 12) {
                            //set_p12_object(this.el.object3D)
                          } else
                            if (this.data === 13) {
                              //set_p13_object(this.el.object3D)
                            } else
                              if (this.data === 14) {
                                //set_p14_object(this.el.object3D)
                              } else
                                if (this.data === 15) {
                                  set_p15_object(this.el.object3D)
                                } else
                                  if (this.data === 16) {
                                    set_p16_object(this.el.object3D)
                                    // j_id 16 が、target の位置
                                    targetRef.current = this.el.object3D; // ここで Target のref を取得
                                  } else
                                    if (this.data === 20) {
                                      //set_p20_object(this.el.object3D)
                                    } else
                                      if (this.data === 21) {
                                        //set_p21_object(this.el.object3D)
                                      } else
                                        if (this.data === 22) {
                                          //set_p22_object(this.el.object3D)
                                        } else
                                          if (this.data === 51) {
                                            set_p51_object(this.el.object3D)
                                          } else
                                            if (this.data >= 100) {
                                              endTool_obj = this.el.object3D
                                              //            console.log("j_id init",this.data)
                                            }
        },
        remove: function () {
          if (this.data === 16) {
            set_p16_object(this.el.object3D)
          }
        },
        update: function () {
          if (this.data >= 100) {
            endTool_obj = this.el.object3D
            //            console.log("j_id update",this.data)
          }
        }
      });

      // 練習用の仮想荷物の登録
      AFRAME.registerComponent('luggage-id', {
        schema: { type: 'string', default: '' },
        init: function () {
          if (!Object.hasOwn(luggage_obj_list, this.data)) {
            //            console.log("luggage-id init", this.data)
            luggage_obj_list[this.data] = this.el.object3D
            luggage_obj_list[this.data].position.set(boxpos_x, 0.05, 0.0)
            boxpos_x = boxpos_x + 0.2
          }
        },
        tick: function (time, deltaTime) {
          if (fallingLuggage === undefined) return
          if (endTool_obj.children.includes(luggage_obj_list[fallingLuggage])) return
          const obj = luggage_obj_list[fallingLuggage]
          const drop_dis = (deltaTime / 1000) * fallingSpeed
          const mesh = convertToMesh(obj)
          const posAttr = mesh.geometry.attributes.position
          const vertex = new THREE.Vector3()
          const worldVertices = []
          for (let i = 0; i < posAttr.count; i = i + 1) {
            vertex.fromBufferAttribute(posAttr, i)
            vertex.applyMatrix4(obj.matrixWorld)
            worldVertices.push(vertex.clone())
          }
          const w_min_vertex = new THREE.Vector3(0, Infinity, 0)
          for (let i = 0; i < worldVertices.length; i = i + 1) {
            if (worldVertices[i].y < w_min_vertex.y) {
              w_min_vertex.copy(worldVertices[i])
            }
          }
          if ((w_min_vertex.y - drop_dis) <= 0) {// 地面につく？
            const adjust = w_min_vertex.y - drop_dis
            obj.position.y = (obj.position.y - drop_dis) - adjust

            // 地面についた時に水平にしたほうが良い（ TODO　）

            fallingLuggage = undefined; // 落下が完了したら fallingLuggage をリセット
            fallingSpeed = 0
            //            const touchResult = boxTouchCheck(target_ref.current, target_ref.current)
            const touchResult = boxTouchCheck(disp_target_ref.current, disp_target_ref.current)
            if (!touchResult.result) {
              touchLuggage = undefined
            } else {
              touchLuggage = touchResult.key
            }
          } else {
            obj.position.y = obj.position.y - drop_dis
            fallingSpeed += 0.02; // 落下速度を徐々に増加させる
          }
        }
      });

      AFRAME.registerComponent('waku-id', {
        schema: { type: 'string', default: '' }, // luggae-id と同じものを指定
        init: function () {
          if (Object.hasOwn(luggage_obj_list, this.data)) {// luggage_obj_list に登録されているものを指定
            //            console.log("waku-id init", this.data)
            const lug_pos = luggage_obj_list[this.data].position
            this.el.object3D.position.set(lug_pos.x + 0.15, lug_pos.y - 0.05, lug_pos.z + 0.15)
          }
        }
      });

      // 練習用(Practice mode) Sub Camera
      AFRAME.registerComponent('extra-camera', {
        schema: { type: 'string', default: 'none' },
        init() {
          console.log("Initialize extra-camera",this.data);
          if (this.data !== "practice") return;
          const sceneEl = this.el.sceneEl;

          const threeScene = sceneEl.object3D;
          const renderer = sceneEl.renderer;

          // レンダリングターゲットと仮想カメラ
          this.rt = new THREE.WebGLRenderTarget(480, 480);
          this.cam = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
          this.base = document.querySelector("#robotBase")
          this.monitor = document.querySelector('#virtualMonitor');
          this.mesh = null;
          console.log("Camera", this.base, this.cam)
          // tick 内で更新
          this.tick = () => {
            if (this.mesh === null){
              this.mesh = this.monitor.getObject3D('mesh')
              if(this.mesh === null)return;
              this.mesh.material.map = this.rt.texture;
              this.mesh.material.metalness = 0.2;
              this.mesh.material.roughness = 0.8;
            }


            this.cam.position.set(disp_target_ref.current.x, disp_target_ref.current.y, disp_target_ref.current.z);// target の
            console.log("CamTick",this.cam, this.mesh)
            this.cam.lookAt(new THREE.Vector3(0,0,0));

            /*
            this.cam.quartanion.setFromAxisAngle(
              y_vec_base, toRadian(vrModeAngle_ref.current)
            ).multiply(
              new THREE.Quaternion().setFromEuler(
                new THREE.Euler(
                  toRadian(wrist_rot_ref.current.x),
                  toRadian(wrist_rot_ref.current.y),
                  toRadian(wrist_rot_ref.current.z), order
                )
              )
            )
              */
             // ここが各レンダリングフレームでの問題
            const prev = renderer.getRenderTarget();
            renderer.setRenderTarget(this.rt);
            renderer.render(threeScene, this.cam);// ここで レンダリング！
            renderer.setRenderTarget(prev);
          };
        },
        remove() { this.rt.dispose(); }
      });


      AFRAME.registerComponent('vr-controller-right', {
        schema: { type: 'string', default: '' },
        init: function () {
          controller_object = this.el.object3D
          this.el.object3D.rotation.order = order
          this.el.addEventListener('triggerdown', (evt) => {
            vrControllStart()
            trigger_on = true
          });
          this.el.addEventListener('triggerup', (evt) => {
            vrControllEnd()
            trigger_on = false
          });
          this.el.addEventListener('gripchanged', (evt) => {
            const grip_value = evt.detail.value * 64
            set_j7_rotate(grip_value)
          });

          this.el.addEventListener('gripdown', (evt) => {
            set_grip(true)
            //gripRef.current = true;
          });
          this.el.addEventListener('gripup', (evt) => {
            set_grip(false)
            //gripRef.current = false;
          });

          // デモでは thumbstickを無効に
          if (true) {
            this.el.addEventListener('thumbstickdown', (evt) => {
              if (tool_load_operation || put_down_box_operation || line_cut_operation) return
              if (tool_menu_on) {
                if (tool_menu_idx < tool_menu_list.length) {// ここはツール変更の範囲
                  if ((tool_menu_idx + 1) !== tool_current_value) {
                    tool_change_value = (tool_menu_idx + 1)
                    tool_current_value = (tool_menu_idx + 1)
                    //set_toolName(tool_menu_list[tool_menu_idx])
                    tool_load_operation = true

                    tool_load_timeout_id = setTimeout(() => {
                      tool_load_operation = false
                      vrControllEnd()
                      if (trigger_on) {
                        vrControllStart()
                      }
                      set_update((v) => v = v + 1)
                    }, 60000) // 60秒間は操作しない(暫定タイマー)
                  } else {
                    //ツール変更なし
                    vrControllEnd()
                    if (trigger_on) {
                      vrControllStart()
                    }
                  }
                } else {
                  if (tool_menu_idx === add_menu_1) {
                    console.log("putDownBox")
                    put_down_box_value = 1
                    put_down_box_operation = true
                    tool_menu_idx = save_tool_menu_idx

                    put_down_box_timeout_id = setTimeout(() => {
                      put_down_box_operation = false
                      vrControllEnd()
                      if (trigger_on) {
                        vrControllStart()
                      }
                      set_update((v) => v = v + 1)
                    }, 60000) // 60秒間は操作しない
                  } else if (tool_menu_idx === add_menu_2) { // ここが line cut!
                      line_cut_value = 1
                      line_cut_operation = true
                      line_cut_timeout_id =setTimeout(() => {
                        line_cut_operation = false
                        vrControllEnd()
                        if (trigger_on) {
                          vrControllStart()
                        }
                        set_update((v) => v = v + 1)
                    }, 10000) // 10秒間は操作しない

                  } else {
                    console.log("cancel tool menu")
                    tool_menu_idx = save_tool_menu_idx
                    vrControllEnd()
                    if (trigger_on) {
                      vrControllStart()
                    }
                  }
                }
              } else {  // tool_menu_off
                if (trigger_on) {
                  vrControllEnd()
                }
                save_tool_menu_idx = tool_menu_idx
                vrControllStart()
              }
              tool_menu_on = !tool_menu_on
              set_update((v) => v = v + 1)
            });
            this.el.addEventListener('thumbstickup', (evt) => {
              tool_change_value = undefined
              put_down_box_value = undefined
              line_cut_value = undefined
              set_update((v) => v = v + 1)
            });
            this.el.addEventListener('thumbstickmoved', (evt) => {
              if (tool_menu_on) {
                if (evt.detail.y === 0 || Math.abs(evt.detail.y) > 0.85) {
                  if (save_thumbstickmoved === 0 && evt.detail.y !== 0) {
                    if (evt.detail.y > 0) {
                      tool_menu_idx = tool_menu_idx + 1
                      if (tool_menu_idx > tool_menu_max) tool_menu_idx = tool_menu_max
                    } else {
                      tool_menu_idx = tool_menu_idx - 1
                      if (tool_menu_idx < 0) tool_menu_idx = 0
                    }
                  } else
                    if (save_thumbstickmoved < 0 && evt.detail.y > 0) {
                      tool_menu_idx = tool_menu_idx + 1
                      if (tool_menu_idx > tool_menu_max) tool_menu_idx = tool_menu_max
                    } else
                      if (save_thumbstickmoved > 0 && evt.detail.y < 0) {
                        tool_menu_idx = tool_menu_idx - 1
                        if (tool_menu_idx < 0) tool_menu_idx = 0
                      }
                  save_thumbstickmoved = evt.detail.y
                }
              }
              set_update((v) => v = v + 1)
            });
          }


          this.el.addEventListener('bbuttondown', (evt) => {
            bButtonRef.current = true;
            console.log("bbuttondown")
            if (robotOperation) {
              robotOperation = false
            } else {
              firstReceiveJoint = true
              switchingVrMode = true
              setTimeout(() => {
                switchingVrMode = false
                robotOperation = true
              }, 1000)
            }
            set_update((v) => v = v + 1)
          });
          this.el.addEventListener('bbuttonup', () => {
            bButtonRef.current = false;
            set_update(v => v + 1);
          });
          this.el.addEventListener('abuttondown', () => {
            aButtonRef.current = true;
            set_update(v => v + 1);
          });
          this.el.addEventListener('abuttonup', () => {
            aButtonRef.current = false;
            set_update(v => v + 1);
          });
        },
        tick: function (time) {
          if ((tickprev + 50) < time) {
            tickprev = time
            let move = false
            const obj = this.el.object3D
            if (!controller_object_position.equals(obj.position)) {
              controller_object_position.copy(obj.position)
              move = true
            }
            if (!controller_object_quaternion.equals(obj.quaternion)) {
              controller_object_quaternion.copy(obj.quaternion)
              move = true
            }
            if (move) {
              set_update((v) => v = v + 1)
            }
          }
        }
      });


      if (!('model-opacity' in AFRAME.components)) { // モデルを透明にするための仕組み
        console.log("Second register");
        //S} else {
        AFRAME.registerComponent("model-opacity", {
          schema: {
            opacity: { type: "number", default: 0.5 }
          },
          init: function () {
            this.el.addEventListener("model-loaded", this.update.bind(this));
          },
          update: function () {
            var mesh = this.el.getObject3D("mesh");
            var data = this.data;
            if (!mesh || !data) {
              return;
            }
            mesh.traverse(function (node) {
              if (node.isMesh) {
                node.material.opacity = data.opacity;
                node.material.transparent = data.opacity < 1.0;
                node.material.needsUpdate = true;
                //                  node.material.format = THREE.RGBAFormat;
              }
            });
          }
        });
      }


      AFRAME.registerComponent('scene', {
        schema: { type: 'string', default: '' },
        init: function () {
          if (props.appmode === AppMode.viewer) {// viewer は VR モードじゃなくても requestする
            window.requestAnimationFrame(onAnimationMQTT);
          }
          this.el.addEventListener('enter-vr', () => {
            //vrModeRef.current = true;
            set_vr_mode(true)
            console.log('enter-vr')

            switchingVrMode = true // VR にはいって３秒間待つ。
            set_debug_message("Please wait..")
            setTimeout(() => {
              switchingVrMode = false
              set_debug_message("")
            }, 2000)

            // VR モードでの角度を設定
            //            baseObject3D.rotateY(-toRadian(vrModeAngle_ref.current))


            const wrist_qua = new THREE.Quaternion().setFromAxisAngle(
              y_vec_base, toRadian(vrModeAngle_ref.current)
            ).multiply(
              new THREE.Quaternion().setFromEuler(
                new THREE.Euler(
                  toRadian(wrist_rot_ref.current.x),
                  toRadian(wrist_rot_ref.current.y),
                  toRadian(wrist_rot_ref.current.z), order
                )
              )
            )
            const wrist_euler = new THREE.Euler().setFromQuaternion(wrist_qua, order)
            //            set_wrist_rot({ x: round(toAngle(wrist_euler.x)), y: round(toAngle(wrist_euler.y)), z: round(toAngle(wrist_euler.z)) })

            const vrcon_qua = wrist_qua.clone().multiply(
              new THREE.Quaternion().setFromEuler(
                new THREE.Euler(
                  (0.6654549523360951 * -1),  //x
                  Math.PI,  //y
                  Math.PI,  //z
                  order
                )
              ).invert()
            )
            robot_save_quat.copy(vrcon_qua)

            //const vrcon_euler = new THREE.Euler().setFromQuaternion(vrcon_qua,order)
            //console.log("wrist_rot",toAngle(vrcon_euler.x),toAngle(vrcon_euler.y),toAngle(vrcon_euler.z))

            // ここからMQTT Start
            xrSession = this.el.renderer.xr.getSession();
            if (props.appmode != AppMode.monitor) {
              xrSession.requestAnimationFrame(onXRFrameMQTT);
              if(AIST_logging){
                xrSession.requestAnimationFrame(onXRFrameRecordMQTT);
              }
                xrSession.addEventListener("end", () => {
                window.requestAnimationFrame(get_real_joint_rot)
              })
              xrSession.requestAnimationFrame(get_real_joint_rot);
            }

            if (props.appmode === AppMode.practice) { // practice モードのカメラ位置
              set_c_pos_x(0)
              set_c_pos_y(-0.575) //ロボット設置高さ
              set_c_pos_z(1.2) //ロボットの設置位置からの前後距離
              set_c_deg_x(0)
              set_c_deg_y(0)  //カメラのデフォルトの向きを反転
              set_c_deg_z(0)
            } else if (!(props.appmode === AppMode.viewer)) {
              set_c_pos_x(0)
              set_c_pos_y(-0.775) //ロボット設置高さ
              set_c_pos_z(1.2) //ロボットの設置位置からの前後距離
              set_c_deg_x(0)
              set_c_deg_y(0)  //カメラのデフォルトの向きを反転
              set_c_deg_z(0)
              //ＶＲモード時のカメラ位置と角度は変更不可（座標はＶＲ内ワールド座標）
            }

          });
          this.el.addEventListener('exit-vr', () => {
            xrSession = undefined
            //vrModeRef.current = false;
            set_vr_mode(false)
            console.log('exit-vr')

            //            baseObject3D.rotateY(toRadian(vrModeAngle_ref.current * -1))
            /*
                        const wrist_qua = new THREE.Quaternion().setFromAxisAngle(
                          y_vec_base, toRadian(vrModeAngle_ref.current * -1)
                        ).multiply(
                          new THREE.Quaternion().setFromEuler(
                            new THREE.Euler(
                              toRadian(wrist_rot_ref.current.x),
                              toRadian(wrist_rot_ref.current.y),
                              toRadian(wrist_rot_ref.current.z), order
                            )
                          )
                        )
            */
            //            const wrist_euler = new THREE.Euler().setFromQuaternion(wrist_qua, order)
            //            set_wrist_rot({ x: round(toAngle(wrist_euler.x)), y: round(toAngle(wrist_euler.y)), z: round(toAngle(wrist_euler.z)) })

            /*
            const wk_m4 = new THREE.Matrix4().multiply(
              new THREE.Matrix4().makeRotationY(toRadian(vrModeAngle_ref.current * -1))
            ).multiply(
              new THREE.Matrix4().setPosition(target_ref.current.x, target_ref.current.y, target_ref.current.z)
            )
            const target_pos = new THREE.Vector3().applyMatrix4(wk_m4)
            set_target_org((vr) => {
              target_move_distance = 0
              vr.x = round(target_pos.x); vr.y = round(target_pos.y); vr.z = round(target_pos.z);
              return vr
            })
              */

            if (!(props.appmode === AppMode.viewer)) {
              set_c_pos_x(0)
              set_c_pos_y(0.35) //ロボット設置高さ
              set_c_pos_z(1.2) //ロボットの設置位置からの前後距離
              set_c_deg_x(0)
              set_c_deg_y(0)  //カメラのデフォルトの向きを反転
              set_c_deg_z(0)
            }
          });
        },
        tick: function (t) {
          set_update((v)=> v=v+1)
        }
      });
    }
  }, [])


  // ロボット姿勢を定常的に送信 (for Viewer)
  const onAnimationMQTT = (time) => {
    const addKey = {}
    if (viewer_tool_change_end !== undefined) {
      console.log("viewer_tool_change_end", viewer_tool_change_end)
      addKey.tool_change = viewer_tool_change_end
      viewer_tool_change_end = undefined
    }
    if (viewer_put_down_box_end !== undefined) {
      console.log("viewer_put_down_box_end", viewer_put_down_box_end)
      addKey.put_down_box = viewer_put_down_box_end
      viewer_put_down_box_end = undefined
    }
    if (tool_current_value !== undefined) {
      addKey.tool_id = tool_current_value
    }
    const robot_state_json = JSON.stringify({
      time: time,
      joints: outputRotateRef.current,
      grip: gripRef.current,
      //        trigger: [gripRef.current, buttonaRef.current, buttonbRef.current, gripValueRef.current]
      ...addKey
    });
    publishMQTT(MQTT_ROBOT_STATE_TOPIC + idtopic, robot_state_json);
    window.requestAnimationFrame(onAnimationMQTT);
  }

  // XR のレンダリングフレーム毎に MQTTを呼び出したい
  const onXRFrameMQTT = (time, frame) => {
    // for next frame
    if (props.appmode === AppMode.viewer) {
      frame.session.requestAnimationFrame(onXRFrameMQTT);
    } else {
      if (vrModeRef.current) {// VR_mode じゃなかったら呼び出さない
        frame.session.requestAnimationFrame(onXRFrameMQTT);
      }
    }
    //    add_debug_message(".")
    //    set_debug_message(`${inputRotateFlg.current}`)

    if ((mqttclient !== null) && publish && receive_state && robotOperation) {// 状態を受信していないと、送信しない
      const addKey = {}
      if (tool_change_value !== undefined) {
        addKey.tool_change = tool_change_value
      }
      if (put_down_box_value !== undefined) {
        addKey.put_down_box = put_down_box_value
      }
      if (line_cut_value !== undefined) { // この項目を増やすと line_cut が行われる
        addKey.line_cut = line_cut_value
      }
      // MQTT 送信
      const ctl_json = JSON.stringify({
        time: time,
        joints: outputRotateRef.current,
        grip: gripRef.current,
        //        trigger: [gripRef.current, buttonaRef.current, buttonbRef.current, gripValueRef.current]
        ...addKey
      });

      publishMQTT(MQTT_CTRL_TOPIC, ctl_json);
    }

  }

  const onXRFrameRecordMQTT = (time, frame) => {
    // for next frame
    if (props.appmode === AppMode.viewer) {
      frame.session.requestAnimationFrame(onXRFrameRecordMQTT);
    } else if (vrModeRef.current) {
      frame.session.requestAnimationFrame(onXRFrameRecordMQTT);
    }

    if ((mqttclient !== null) && publish && receive_state && robotOperation) {// 状態を受信していないと、送信しない
      const addKey = {}
      if (tool_change_value !== undefined) {
        addKey.tool_change = tool_change_value
      }
      if (put_down_box_value !== undefined) {
        addKey.put_down_box = put_down_box_value
      }

      const rc = RightRef?.current || null;
      const ctrlPos = rc?.object3D?.position || null;
      const ctrlQua = rc?.object3D?.quaternion || null;

      //コントローラーのインプット
      const ctrlInputs = {
        grip: gripRef.current,
        gripvalue: j7_rotate_ref.current,
        trigger: trigger_on,
        a: aButtonRef.current,
        b: bButtonRef.current,
        axis: axisRef.current,
      };

      const cam = CameraRef?.current || null;
      const hmdPos = cam?.object3D?.position || null;
      const hmdQua = cam?.object3D?.quaternion || null;

      //コントローラーの値
      const controllerBlock = (ctrlPos && ctrlQua) ? {
        pos: { x: ctrlPos.x, y: ctrlPos.y, z: ctrlPos.z },
        qua: { x: ctrlQua.x, y: ctrlQua.y, z: ctrlQua.z, w: ctrlQua.w },
        inputs: ctrlInputs,
      } : undefined;

      //ヘッドセットの値
      const headsetBlock = (hmdPos && hmdQua) ? {
        pos: { x: hmdPos.x, y: hmdPos.y, z: hmdPos.z },
        qua: { x: hmdQua.x, y: hmdQua.y, z: hmdQua.z, w: hmdQua.w }
      } : undefined;

      // MQTT 送信
      const ctl_json = JSON.stringify({
        time: Date.now(),
        joints: outputRotateRef.current,
        grip: gripRef.current,
        controller: controllerBlock,
        headset: headsetBlock,
        ...addKey
      });

      // 送信前ログ
      //console.log("[MQTT SEND Record]", ctl_obj);

      publishMQTT(MQTT_AIST_LOGGER_TOPIC, ctl_json);
    }
  };

  const edit_pos = (posxyz) => `${posxyz.x} ${posxyz.y} ${posxyz.z}`
  const edit_pos_offset = (posxyz) => `${posxyz.x + vrModeOffsetX_ref.current} ${posxyz.y} ${posxyz.z}`

  const controllerProps = {
    target, set_target,
    toolName, toolNameList, set_toolName,
    j1_rotate, set_j1_rotate, j2_rotate, set_j2_rotate, j3_rotate, set_j3_rotate,
    j4_rotate, set_j4_rotate, j5_rotate, set_j5_rotate, j6_rotate_org, set_j6_rotate_org, j7_rotate, set_j7_rotate,
    c_pos_x, set_c_pos_x, c_pos_y, set_c_pos_y, c_pos_z, set_c_pos_z,
    c_deg_x, set_c_deg_x, c_deg_y, set_c_deg_y, c_deg_z, set_c_deg_z,
    wrist_rot, set_wrist_rot,
    tool_rotate, set_tool_rotate, normalize180, vr_mode: vrModeRef.current,
    vrModeAngle, set_vrModeAngle, vrModeOffsetX, set_vrModeOffsetX,
    toolChange1, toolChange2
  }

  const robotProps = {
    joint_pos, j2_rotate, j3_rotate, j4_rotate, j5_rotate, j6_rotate, j7_rotate,
    toolNameList, toolName, cursor_vis, box_vis, edit_pos, pos_add, j1_error, j2_error, j3_error, j4_error, j5_error, j6_error
  }

  const Toolmenu = (props) => {
    const refpos = 0.38
    const interval = 0.15
    if (tool_menu_on) {
      return (
        <a-entity position="0.5 0.5 -0.5">
          <a-plane width="1" height="1.03" color="#222" opacity="0.8"></a-plane>
          <a-entity
            geometry="primitive: plane; width: 0.81; height: 0.11;"
            material="color: #00ff00;"
            position={`0 ${refpos - (tool_menu_idx * interval)} 0.009`}>
          </a-entity>
          {tool_menu_list.map((tool, idx) => {
            return (
              <a-entity key={idx}
                geometry="primitive: plane; width: 0.8; height: 0.1;"
                material="color: #2196F3"
                position={`0 ${refpos - (idx * interval)} 0.01`}
                class="menu-button"
                text={`value: TOOL-${idx + 1}; align: center; color: white;`}>
              </a-entity>
            )
          })}
          <a-entity
            geometry="primitive: plane; width: 0.8; height: 0.1;"
            material="color: #2196F3"
            position={`0 ${refpos - (tool_menu_list.length * interval)} 0.01`}
            class="menu-button"
            text="value: PUT DOWN BOX; align: center; color: white;">
          </a-entity>
          <a-entity
            geometry="primitive: plane; width: 0.8; height: 0.1;"
            material="color: #2196F3"
            position={`0 ${refpos - ((tool_menu_list.length+1) * interval)} 0.01`}
            class="menu-button"
            text="value: LINE-CUT; align: center; color: white;">
          </a-entity>
          <a-entity
            geometry="primitive: plane; width: 0.8; height: 0.1;"
            material="color: #2196F3"
            position={`0 ${refpos - (tool_menu_max * interval)} 0.01`}
            class="menu-button"
            text="value: CANCEL; align: center; color: white;">
          </a-entity>
        </a-entity>)
    } else {
      if (tool_load_operation) {
        return (
          <a-entity
            geometry="primitive: plane; width: 0.5; height: 0.15;"
            material="color: #000000"
            position="0 0.15 0.2"
            text="value: TOOL LOADING!!; align: center; color: yellow; wrap-count: 15;">
          </a-entity>)
      } else {
        if (put_down_box_operation) {
          return (
            <a-entity
              geometry="primitive: plane; width: 0.5; height: 0.15;"
              material="color: #000000"
              position="0 0.15 0.2"
              text="value: PUT DOWN BOX!!; align: center; color: yellow; wrap-count: 15;">
            </a-entity>)
        } else {
          if (line_cut_operation) {
            return (
              <a-entity
                geometry="primitive: plane; width: 0.5; height: 0.15;"
                material="color: #000000"
                position="0 0.15 0.2"
                text="value: LINE CUTTING!!; align: center; color: yellow; wrap-count: 15;">
              </a-entity>)
          } else {
            return null
          }
        }
      }
    }

  }

  /*            
  <a-entity id="robotBase" position={`${offsetX} -0.01 0.05`} rotation="0 0 0" shadow="receive: true;"
    geometry="primitive: box; width: 1.2; height: 0.020; depth: 0.8;"
    material={(props.target_error ? "color:#ff7f50;" : "color:#7BC8A4;") + " opacity: 0.7;"}>
  </a-entity>
  */

  // practice 対応のロボットの下の部分
  const RobotBase = (props) => {
    const offsetX = vrModeOffsetX_ref.current - 0.50;
    if (props.appmode === AppMode.practice) { // 練習モードでは、四角い枠
      return (
        <a-box id="robotBase" position={`${offsetX} -0.01 0.05`} rotation="0 0 0" shadow="receive: true;"
          width="1.2" height="0.02" depth="0.8" color={props.target_error ? "#ff7f50" : "#7BC8A4"}
          opacity="0.7"></a-box>
      )
    } else {
      return (
        <a-circle id="circle3D" position={`${vrModeOffsetX_ref.current} 0 0`} rotation="-90 0 0" radius={props.appmode === AppMode.practice ? "0.75" : "0.3"} color={target_error ? "#ff7f50" : "#7BC8A4"} opacity="0.5">

        </a-circle>)
    }
  }

  const conv_rot = (q) => {
    //オイラーから pos へ
    //    const out ={x:toAngle(eu.x), y:toAngle(eu.y), z:toAngle(eu.z)}
    //    console.log("Conv rot Out",out)
    const eu = new THREE.Euler().setFromQuaternion(q, order)
    const out = { x: toAngle(eu.x), y: toAngle(eu.y), z: toAngle(eu.z) }
    //    console.log("Conv rot Out",out)

    return out;
  }

  // practice 用の Waku オブジェクト
  const Waku = ({
    size = 0.08,
    thickness = 0.005,
    color = "#222",
    epsilon = 0.004, // 平面上に置くときのZファイティング回避の微小オフセット
  }) => {
    const half = size / 2;
    const t = thickness;
    return (
      <a-entity rotation="-90 0 0">
        {/* 上辺 */}
        <a-plane
          width={size} height={t} color={color}
          position={`0 ${half} ${epsilon} `}
        ></a-plane>
        {/* 下辺 */}
        <a-plane
          width={size} height={t} color={color}
          position={`0 -${half} ${epsilon}`}
        ></a-plane>

        {/* 右辺 */}
        <a-plane
          width={t} height={size} color={color}
          position={`${half} 0 ${epsilon}`}
        ></a-plane>

        {/* 左辺 */}
        <a-plane
          width={t} height={size} color={color}
          position={`-${half} 0 ${epsilon}`}
        ></a-plane>
      </a-entity>
    );
  };

  // 前後のずれを可視化したい
  const FrontLine = ()=> {
    //ガイドを表示したい
    const we = getWorldEuler(p15_object)
    const angleX = toAngle(we.x)-90
    const angleY = -toAngle(we.y)
    const angleZ = normalize180(toAngle(we.z)+180)
    const zx = Math.cos(-we.z)*0.12
    const zy = Math.sin(-we.z)*0.12
    return {
        angleStr:`${round(angleX,1)},${round(angleY,1)},${round(angleZ,1)}`,
        zPosL: `${zx-0.25} ${zy+0.1} -0.799`,
        zPosR: `${-zx-0.25} ${-zy+0.1} -0.799`,
        zRot : `0 0 ${90-angleZ}`,
        yPos: `${angleY/45-0.25} 0.24 -0.799`,
        xPos: `-0.056 ${angleX/45+0.1} -0.799`
       }
    }

  const {angleStr , angleX, angleY, yPos, xPos, zPosL, zPosR, zRot}= FrontLine()

  if (rendered) {

    let rtc_message = "";
    if (props.appmode === AppMode.withCam || props.appmode === AppMode.withDualCam || props.appmode === AppMode.monitor) {
      if (rtcStats_ref.current.length > 0) {
        rtc_message = ["WebRTC Stats:"];
        rtcStats_ref.current.forEach((stat, idx) => {
          rtc_message.push(`${stat}`);
        })
        rtc_message = rtc_message.join(' ')
 //       console.log("RTC!, rtc_message",rtc_message)
      }
    }
    return (
      <>
        <a-scene scene shadow="type: pcf" xr-mode-ui={`enabled: ${!(props.appmode === AppMode.viewer) ? 'true' : 'false'}; XRMode: xr`} >
         
          {  // ステレオカメラ使うか extra-camera={props.appmode}>
   
            (props.appmode === AppMode.withCam || props.appmode === AppMode.withDualCam || props.appmode === AppMode.monitor) ?
              <StereoVideo rendered={rendered} set_rtcStats={set_rtcStats} stereo_visible='true'
                appmode={props.appmode} 
              /> : <></>
          }

          <a-entity
            oculus-touch-controls="hand: right" vr-controller-right ref={RightRef} visible="false"
            event-set__abuttondown="_event: abuttondown; _target: #root; _emit: abutton-down"
            event-set__abuttonup="_event: abuttonup; _target: #root; _emit: abutton-up"
            event-set__bbuttondown="_event: bbuttondown; _target: #root; _emit: bbutton-down"
            event-set__bbuttonup="_event: bbuttonup; _target: #root; _emit: bbutton-up"
          />
          {/*
          <a-entity oculus-touch-controls="hand: right" vr-controller-right visible={`${false}`}>
            <Cursor3dp j_id="99" pos={{ x: 0, y: 0, z: 0 }} visible={false}>   </Cursor3dp>
          </a-entity>
          <Cursor3dp j_id="98" pos={{ x: -0.15, y: 1, z: 0.2 }} rot={conv_rot(controller_reframe)} visible={true}>   </Cursor3dp>
          <Cursor3dp j_id="98" pos={{ x: -0.15, y: 0.8, z: 0.2 }} rot={conv_rot(controller_reframe1)} visible={true}>   </Cursor3dp>

          <Cursor3dp j_id="97" pos={{ x: -0.3, y: 1, z: 0.2 }} rot={conv_rot(controller_reframe2)} visible={true}>   </Cursor3dp>
          <Cursor3dp j_id="96" pos={{ x: -0.45, y: 1, z: 0.2 }} rot={conv_rot(controller_reframe3)} visible={true}>   </Cursor3dp>
            */}
          {/* Practice 用のベース */}
          <RobotBase appmode={props.appmode} target_error={target_error} />
          {/*  <a-circle id="circle3D" position="0 0 0" rotation="-90 0 0" radius={props.appmode===AppMode.practice?"0.75":"0.3"} color={target_error?"#ff7f50":"#7BC8A4"} opacity="0.5"></a-circle> */}

          <Assets appmode={props.appmode} />
          {/*
          <RobotModel base_rotate={vrModeAngle_ref.current} {...robotProps} />
          <Cursor3dp j_id="20" pos={{ x: 0, y: 0, z: 0 }} visible={true}>
            <Cursor3dp j_id="21" pos={{ x: 0, y: 0, z: p15_16_len }} visible="true"></Cursor3dp>
            <Cursor3dp j_id="22" pos={{ x: 0, y: -joint_pos.j5.y, z: 0 }} rot={{ x: 0, y: j1_rotate, z: 0 }} visible={true}></Cursor3dp>
          </Cursor3dp>          
          */}
          <RobotModel base_rotate={0} {...robotProps} />

          {/*<!-- 全体のフィル（影は落とさない） -->*/}
          <a-entity light="type: hemisphere; color: #fff; groundColor: #efe; intensity: 0.3"></a-entity>

          {/*<!-- 斜め右前上からの太陽光（影あり） -->*/}
          <a-entity position="1 4 1"
            light="type: directional;
                   intensity: 0.3;
                   castShadow: true;
                   shadowMapWidth: 512; shadowMapHeight: 512;
                   shadowBias: -0.0002;
                   shadowCameraAutomatic: true">
          </a-entity>

          {/* 過去のライト
                          text={`value: '${wrist_rot_ref.x} ${wrist_rot_ref.y}'; color: gray; backgroundColor: rgb(31, 219, 131); border: #000000; whiteSpace: pre`}

          <a-entity light="type: directional; color: #FFF; intensity: 0.25" position="1 1 1"></a-entity>
          <a-entity light="type: directional; color: #FFF; intensity: 0.25" position="-1 1 1"></a-entity>
          <a-entity light="type: directional; color: #EEE; intensity: 0.25" position="-1 1 -1"></a-entity>
          <a-entity light="type: directional; color: #FFF; intensity: 0.25" position="1 1 -1"></a-entity>
          <a-entity light="type: directional; color: #EFE; intensity: 0.05" position="0 -1 0"></a-entity>
          */}
          <a-entity id="rig" position={`${c_pos_x} ${c_pos_y} ${c_pos_z}`} rotation={`${c_deg_x} ${c_deg_y} ${c_deg_z}`}>
            {/* for stereo camera */}
            <a-camera id="camera" stereocam="eye:left" position="0 0 0" ref={CameraRef}>
              <a-entity id="UIBack">
                 {(props.appmode === AppMode.practice) ?
                  <a-plane id="virtualMonitor" position='-0.25 .1 -0.8' scale='0.25 0.25 1' width='1.6' height='1.2'
                  material="shader: standard" visible="true"></a-plane>:
                  <></>
                  }
                  {/*
              <a-entity 
                text={`value: ${angleStr}; color: gray; backgroundColor: rgb(31, 219, 131); border: #000000; whiteSpace: pre`}
                position="0.1 0.28 -0.8"
              />
                  
                  */}                 
              </a-entity>
              <a-plane position="-0.25 0.24 -0.7995" rotation="0 0 90" width="0.013" height="0.003" color="blue" />
              <a-plane position={yPos} rotation="0 0 90" width="0.015" height="0.005" color="red" />
              <a-plane position={xPos} rotation="0 0 90" width="0.005" height="0.015" color="red" />
              <a-plane position="-0.056  0.1 -0.7995" rotation="0 0 90" width="0.003" height="0.013" color="blue" />

              <a-plane position={zPosL} rotation={zRot} width="0.005" height="0.018" color="pink" opacity="0.9" />
              <a-plane position={zPosR} rotation={zRot} width="0.005" height="0.018" color="pink" opacity="0.9" />
                            
              {/*
              <a-sphere position={yPos} scale="0.012 0.012 0.012" color="red" >
              </a-sphere>
             
                position="-1 3.5 -3"
              <a-entity
                text={`value: ${rtc_message}; color: gray; backgroundColor: rgb(31, 219, 131); border: #000000; whiteSpace: pre`}
                position="0 0.35 -1.4"
              /> */}
            </a-camera>
          </a-entity>
          <a-sphere position={edit_pos_offset(disp_target)} scale="0.012 0.012 0.012" color={target_error ? "red" : "yellow"} visible={`${!(props.appmode === AppMode.viewer)}`}></a-sphere>
          {/* 
            <a-box position={edit_pos(test_pos)} scale="0.03 0.03 0.03" color="green" visible={`${true}`}></a-box> 
            <a-cylinder j_id="51" color="red" height="0.1" radius="0.005" position={edit_pos({x:0.3,y:0.3,z:0.3})}></a-cylinder>
          <Line pos1={{ x: 1, y: 0.0001, z: 1 }} pos2={{ x: -1, y: 0.0001, z: -1 }} visible={cursor_vis} color="white"></Line>
          <Line pos1={{ x: 1, y: 0.0001, z: -1 }} pos2={{ x: -1, y: 0.0001, z: 1 }} visible={cursor_vis} color="white"></Line>
          <Line pos1={{ x: 1, y: 0.0001, z: 0 }} pos2={{ x: -1, y: 0.0001, z: 0 }} visible={cursor_vis} color="white"></Line>
          <Line pos1={{ x: 0, y: 0.0001, z: 1 }} pos2={{ x: 0, y: 0.0001, z: -1 }} visible={cursor_vis} color="white"></Line>
          */}
          <Toolmenu />
          {(props.appmode === AppMode.practice) ?
            <>
              <a-box luggage-id="box1"
                width="0.07" height="0.07" depth="0.07"
                color="#ff8800"
                shadow="cast: true;"
                opacity="0.9"
                visible="true">
              </a-box>
              <a-box luggage-id="box2"
                width="0.07" height="0.07" depth="0.07"
                color="#8888ff"
                shadow="cast: true;"
                opacity="0.9"
                visible="true">
              </a-box>
              {/* target の　枠 */}
              <a-entity waku-id="box1"><Waku color="#ff8800" /></a-entity>
              <a-entity waku-id="box2" rotation="0 45 0" ><Waku color="#8888ff" /></a-entity>

            </>
            : <></>}
          {/* debug 用インジケータ 
            <a-entity position="-0.3 1.0 -0.5" rotation="0 0 0" geometry="primitive: plane; width: 1.2; height: 0.2;" material="color: #ccddcc; opacity: 0.7;" visible={`${true}`}>
              <a-entity text={`value: ${debug_message}; color: black; align:center`} position="0 0 0.0001"></a-entity>
            </a-entity>
            */}

        </a-scene>
        {/*
        <Controller {...controllerProps} />
        <div className="footer" >
          <div>
            {`${props.appmode}:`}
            {`info:{direction:${round(wrist_degree.direction)},angle:${round(wrist_degree.angle)}}`}
            {` ${dsp_message}`}
            {props.appmode === AppMode.viewer ? <>{` input rot:[${input_rotateRef.current.map((el, i) => ` j${i + 1} : ${round(el)} `)}]`}</> : null}
            {!(props.appmode === AppMode.viewer) ? <>{` output rot:[${outputRotateRef.current.map((el, i) => ` j${i + 1} : ${round(el)} `)}]`}</> : null}
          </div>
        </div>
        */}
      </>
    );
  } else {
    return (
      <a-scene xr-mode-ui={`enabled: ${!(props.appmode === AppMode.viewer) ? 'true' : 'false'}; XRMode: xr`}>
        <Assets appmode={props.appmode} />
      </a-scene>
    )
  }
}

const Assets = (props) => {
  // const path = (props.appmode===AppMode.normal)?"":"../"
  const path = "../"

  return (
    <a-assets>
      {/*Model*/}
      <a-asset-items id="base" src={`${path}base_link.gltf`} ></a-asset-items>
      <a-asset-items id="j1" src={`${path}link1.gltf`} ></a-asset-items>
      <a-asset-items id="j2" src={`${path}link2.gltf`} ></a-asset-items>
      <a-asset-items id="j3" src={`${path}link3.gltf`} ></a-asset-items>
      <a-asset-items id="j4" src={`${path}link4.gltf`} ></a-asset-items>
      <a-asset-items id="j5" src={`${path}link5.gltf`} ></a-asset-items>
      <a-asset-items id="j6" src={`${path}link6.gltf`} ></a-asset-items>
      <a-asset-items id="j7" src={`${path}link7.gltf`} ></a-asset-items>
      <a-asset-items id="j8_r" src={`${path}link8_r.gltf`} ></a-asset-items>
      <a-asset-items id="j8_l" src={`${path}link8_l.gltf`} ></a-asset-items>
      <a-asset-items id="wingman" src={`${path}wingman.gltf`} ></a-asset-items>
      <a-asset-items id="vgc10-1" src={`${path}gripper_vgc10_1.gltf`} ></a-asset-items>
      <a-asset-items id="vgc10-1L" src={`${path}gripper_vgc10_1L.gltf`} ></a-asset-items>
      <a-asset-items id="vgc10-4" src={`${path}gripper_vgc10_4.gltf`} ></a-asset-items>
      <a-asset-items id="cutter" src={`${path}ss-cutter2-end.gltf`} ></a-asset-items>
      <a-asset-items id="boxLiftUp" src={`${path}sanko_box_lift_up_end_v2.gltf`} ></a-asset-items>
    </a-assets>
  )
}

const RobotModel = (props) => {
  const { cursor_vis, edit_pos, joint_pos, pos_add, j1_error, j2_error, j3_error, j4_error, j5_error, j6_error, base_rotate } = props
  //  console.log("Joint base",joint_pos.base)
  //  <a-entity j_id="0" gltf-model="#base" position={edit_pos(joint_pos.base)} model-opacity="0.8" rotation={`0 ${base_rotate} 0'}`}>
  return (<>
    <a-entity j_id="0" gltf-model="#base" position={edit_pos(joint_pos.base)} model-opacity="0.8">
      <a-entity geometry="primitive: circle; radius: 0.16;" material="color: #00FFFF; opacity: 0.8" position="0 0.1 0" rotation="-90 0 0" visible={`${j1_error}`}></a-entity>
      <a-entity geometry="primitive: circle; radius: 0.16;" material="color: #00FFFF; opacity: 0.8" position="0 0.1 0" rotation="90 0 0" visible={`${j1_error}`}></a-entity>
      <a-entity j_id="1" gltf-model="#j1" position={edit_pos(joint_pos.j1)} model-opacity="0.8" shadow="cast: true">
        <a-entity position="0 0.1 0" rotation="90 0 0" visible={`${j1_error}`}>
          <a-cylinder position="0 0.08 0" rotation="0 0 0" radius="0.003" height="0.16" color="#FF0000"></a-cylinder>
        </a-entity>
        <a-entity geometry="primitive: circle; radius: 0.14; thetaStart: -60; thetaLength: 300" material="color: #00FFFF; opacity: 0.8" position={edit_pos(pos_add(joint_pos.j2, { x: -0.08, y: 0, z: 0 }))} rotation="0 90 0" visible={`${j2_error}`}></a-entity>
        <a-entity geometry="primitive: circle; radius: 0.14; thetaStart: -60; thetaLength: 300" material="color: #00FFFF; opacity: 0.8" position={edit_pos(pos_add(joint_pos.j2, { x: -0.08, y: 0, z: 0 }))} rotation="0 -90 0" visible={`${j2_error}`}></a-entity>
        <a-entity j_id="2" gltf-model="#j2" position={edit_pos(joint_pos.j2)} model-opacity="0.8" shadow="cast: true">
          <a-entity position="-0.08 0 0" rotation="0 0 0" visible={`${j2_error}`}>
            <a-cylinder position="0 0.07 0" rotation="0 0 0" radius="0.003" height="0.14" color="#FF0000"></a-cylinder>
          </a-entity>
          <a-entity geometry="primitive: circle; radius: 0.14; thetaStart: -60; thetaLength: 300" material="color: #00FFFF; opacity: 0.8" position={edit_pos(pos_add(joint_pos.j3, { x: -0.09, y: 0, z: 0 }))} rotation="0 90 0" visible={`${j3_error}`}></a-entity>
          <a-entity geometry="primitive: circle; radius: 0.14; thetaStart: -60; thetaLength: 300" material="color: #00FFFF; opacity: 0.8" position={edit_pos(pos_add(joint_pos.j3, { x: -0.09, y: 0, z: 0 }))} rotation="0 -90 0" visible={`${j3_error}`}></a-entity>
          <a-entity j_id="3" gltf-model="#j3" position={edit_pos(joint_pos.j3)} model-opacity="0.8" shadow="cast: true">
            <a-entity position="-0.09 0 0" rotation="0 0 0" visible={`${j3_error}`}>
              <a-cylinder position="0 0.07 0" rotation="0 0 0" radius="0.003" height="0.14" color="#FF0000"></a-cylinder>
            </a-entity>
            <a-entity geometry="primitive: circle; radius: 0.14;" material="color: #00FFFF; opacity: 0.8" position="-0.03 0.302 0" rotation="-90 0 0" visible={`${j4_error}`}></a-entity>
            <a-entity geometry="primitive: circle; radius: 0.14;" material="color: #00FFFF; opacity: 0.8" position="-0.03 0.302 0" rotation="90 0 0" visible={`${j4_error}`}></a-entity>
            <a-entity j_id="4" gltf-model="#j4" position={edit_pos(joint_pos.j4)} model-opacity="0.8" shadow="cast: true">
              <a-entity position="0 -0.087 0" rotation="90 0 0" visible={`${j4_error}`} >
                <a-cylinder position="0 0.07 0" rotation="0 0 0" radius="0.003" height="0.14" color="#FF0000"></a-cylinder>
              </a-entity>
              <a-entity geometry="primitive: circle; radius: 0.14; thetaStart: -60; thetaLength: 300" material="color: #00FFFF; opacity: 0.8" position={edit_pos(pos_add(joint_pos.j5, { x: 0.077, y: 0, z: 0 }))} rotation="0 90 0" visible={`${j5_error}`}></a-entity>
              <a-entity geometry="primitive: circle; radius: 0.14; thetaStart: -60; thetaLength: 300" material="color: #00FFFF; opacity: 0.8" position={edit_pos(pos_add(joint_pos.j5, { x: 0.077, y: 0, z: 0 }))} rotation="0 -90 0" visible={`${j5_error}`}></a-entity>
              <a-entity j_id="5" gltf-model="#j5" position={edit_pos(joint_pos.j5)} model-opacity="0.8" shadow="cast: true">
                <a-entity position="0.077 0 0" rotation="90 0 0" visible={`${j5_error}`}>
                  <a-cylinder position="0 0.07 0" rotation="0 0 0" radius="0.003" height="0.14" color="#FF0000"></a-cylinder>
                </a-entity>
                <a-entity geometry="primitive: circle; radius: 0.14;" material="color: #00FFFF; opacity: 0.8" position="0.15 0 0.0805" rotation="0 0 0" visible={`${j6_error}`}></a-entity>
                <a-entity geometry="primitive: circle; radius: 0.14;" material="color: #00FFFF; opacity: 0.8" position="0.15 0 0.0805" rotation="0 180 0" visible={`${j6_error}`}></a-entity>
                <a-entity j_id="6" gltf-model="#j6" position={edit_pos(joint_pos.j6)} model-opacity="0.8" shadow="cast: true">
                  <a-entity position="0 0 0.0805" rotation="0 0 0" visible={`${j6_error}`}>
                    <a-cylinder position="0 0.07 0" rotation="0 0 0" radius="0.003" height="0.14" color="#FF0000"></a-cylinder>
                  </a-entity>
                  <Model_Tool {...props} />
                  {/*<a-cylinder color="crimson" height="0.1" radius="0.005" position={edit_pos(joint_pos.j7)}></a-cylinder>*/}
                  <Cursor3dp j_id="15" visible={false} />
                </a-entity>
              </a-entity>
              <Cursor3dp j_id="14" pos={{ x: joint_pos.j5.x, y: 0, z: 0 }} visible={cursor_vis} />
              <Cursor3dp j_id="13" visible={cursor_vis} />
            </a-entity>
            {/*<Cursor3dp j_id="12" visible={cursor_vis}/>*/}
          </a-entity>
          {/*<Cursor3dp j_id="11" visible={cursor_vis}/>*/}
        </a-entity>
      </a-entity>
    </a-entity>
  </>
  )
}

const Model_Tool = (props) => {
  const { j7_rotate, joint_pos: { j7: j7pos }, cursor_vis, box_vis, edit_pos } = props
  const Spacer = 0.03
  const Toolpos = [j7pos, { x: 0, y: 0, z: 0.01725 }, { x: 0, y: 0, z: 0.02845 }, { x: 0, y: 0, z: 0.02845 }, { x: 0, y: 0, z: 0.01725 }, { x: 0, y: 0, z: 0.0218 }]

  // ツール毎のTCPとの相対位置
  const p16pos = [j7pos,
    { ...j7pos, z: j7pos.z + 0.12 + Spacer },
    { ...j7pos, z: j7pos.z + 0.2 + Spacer }, // 
    { ...j7pos, z: j7pos.z + 0.095 + Spacer },
    { ...j7pos, z: j7pos.z + 0.02 + Spacer },
    { ...j7pos, z: j7pos.z + 0 + Spacer }]
  const x = 36 / 90
  const finger_pos = ((j7_rotate * x) / 1000) + 0.0004
  const j8_r_pos = { x: finger_pos, y: 0, z: 0.11 }
  const j8_1_pos = { x: -finger_pos, y: 0, z: 0.11 }
  const wingman_spacer = { x: 0, y: 0, z: 0.17275 }

  const toolModel_table = [
    <>
      <a-entity j_id="100"></a-entity>
      <Cursor3dp j_id="16" pos={p16pos[0]} visible={cursor_vis} />
      <a-box color="yellow" scale="0.02 0.02 0.02" position={edit_pos(p16pos[0])} visible={`${box_vis}`}></a-box>
    </>,
    <a-entity gltf-model="#wingman" position={edit_pos(wingman_spacer)} rotation={`0 0 0`} model-opacity="0.8">
      <a-entity gltf-model="#j7" j_id="101" position={edit_pos(Toolpos[1])} model-opacity="0.8">
        <a-entity gltf-model="#j8_r" position={edit_pos(j8_r_pos)} model-opacity="0.8"></a-entity>
        <a-entity gltf-model="#j8_l" position={edit_pos(j8_1_pos)} model-opacity="0.8"></a-entity>
      </a-entity>
      <a-box color="yellow" scale="0.02 0.02 0.02" position={edit_pos(p16pos[1])} visible={`${box_vis}`}></a-box>
      <Cursor3dp j_id="16" pos={p16pos[1]} visible={cursor_vis} />
    </a-entity>,
    <a-entity gltf-model="#wingman" position={edit_pos(wingman_spacer)} rotation={`0 0 0`} model-opacity="0.8">
      <a-entity gltf-model="#vgc10-1L" j_id="102" position={edit_pos(Toolpos[2])} rotation={`0 0 0`} model-opacity="0.8" shadow="cast: true">

        <a-box color="yellow" scale="0.02 0.02 0.02" position={edit_pos(p16pos[2])} visible={`${box_vis}`}></a-box>

        <Cursor3dp j_id="16" pos={p16pos[2]} visible={false} />
        <Cursor3dp j_id="86" pos={`${p16pos[2].x - 0.4} ${p16pos[2].y} ${p16pos[2].z}`} visible={false} />
      </a-entity>
    </a-entity>,
    <a-entity gltf-model="#wingman" position={edit_pos(wingman_spacer)} rotation={`0 0 0`} model-opacity="0.8">
      <a-entity gltf-model="#vgc10-4" j_id="103" position={edit_pos(Toolpos[3])} rotation={`0 0 0`} model-opacity="0.8">
        <Cursor3dp j_id="16" pos={p16pos[3]} visible={cursor_vis} />
        <a-box color="yellow" scale="0.02 0.02 0.02" position={edit_pos(p16pos[3])} visible={`${box_vis}`}></a-box>
      </a-entity>
    </a-entity>,
    <a-entity gltf-model="#wingman" position={edit_pos(wingman_spacer)} rotation={`0 0 0`} model-opacity="0.8">
      <a-entity gltf-model="#cutter" j_id="104" position={edit_pos(Toolpos[4])} rotation={`0 0 0`} model-opacity="0.8">
        <a-entity></a-entity>
        <a-box color="yellow" scale="0.02 0.02 0.02" position={edit_pos(p16pos[3])} visible={`${box_vis}`}></a-box>
        <Cursor3dp j_id="16" pos={p16pos[4]} visible={cursor_vis} />
      </a-entity>
    </a-entity>,
    <a-entity gltf-model="#wingman" position={edit_pos(wingman_spacer)} rotation={`0 0 0`} model-opacity="0.8">
      <a-entity gltf-model="#boxLiftUp" j_id="105" position={edit_pos(Toolpos[5])} rotation={`0 0 0`} model-opacity="0.8">
        <a-entity></a-entity>
        <Cursor3dp j_id="16" pos={p16pos[5]} visible={cursor_vis} />
        <a-box color="yellow" scale="0.02 0.02 0.02" position={edit_pos(p16pos[3])} visible={`${box_vis}`}></a-box>
      </a-entity>
    </a-entity>
  ]
  const { toolNameList, toolName } = props
  const findindex = toolNameList.findIndex((e) => e === toolName)
  if (findindex >= 0) {
    return (toolModel_table[findindex])
  }
  return null
}



const Cursor3dp = (props) => {
  const { pos = { x: 0, y: 0, z: 0 }, rot = { x: 0, y: 0, z: 0 }, len = 0.3, opa = 1, children, visible = false, ...otherprops } = props;

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
  const { pos1 = { x: 0, y: 0, z: 0 }, pos2 = { x: 0, y: 0, z: 0 }, color = "magenta", opa = 1, visible = false, ...otherprops } = props;

  const line_para = `start: ${pos1.x} ${pos1.y} ${pos1.z}; end: ${pos2.x} ${pos2.y} ${pos2.z}; color: ${color}; opacity: ${opa};`

  return <a-entity
    {...otherprops}
    line={line_para}
    position={`0 0 0`}
    visible={`${visible}`}
  ></a-entity>
}
