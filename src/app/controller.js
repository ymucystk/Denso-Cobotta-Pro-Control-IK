"use client";
import * as React from 'react'
import "./controller.css";

export default function Controller(props) {
  const {toolNameList, toolName} = props
  const {target} = props
  const {j1_rotate, j2_rotate, j3_rotate, j4_rotate, j5_rotate, j6_rotate, j7_rotate} = props
  const {c_pos_x, c_pos_y, c_pos_z} = props
  const {c_deg_x, c_deg_y, c_deg_z} = props
  const {wrist_rot_x,wrist_rot_y,wrist_rot_z} = props
  const {tool_rotate} = props
  const {normalize180} = props
  const {vr_mode} = props
  /*
  const set_toolName = (e)=>{
    props.set_toolName(e.target.value)
  }*/

  const set_j1_rotate = (e)=>{
    let value = Number.parseFloat(e.target.value || 0)
    if(Math.abs(value)===180){
      value = value * -1
    }
    props.set_j1_rotate(value)
  }

  const set_j2_rotate = (e)=>{
    let value = Number.parseFloat(e.target.value || 0)
    if(Math.abs(value)===180){
      value = value * -1
    }
    props.set_j2_rotate(value)
  }

  const set_j3_rotate = (e)=>{
    let value = Number.parseFloat(e.target.value || 0)
    if(Math.abs(value)===180){
      value = value * -1
    }
    props.set_j3_rotate(value)
  }

  const set_j4_rotate = (e)=>{
    let value = Number.parseFloat(e.target.value || 0)
    if(Math.abs(value)===180){
      value = value * -1
    }
    props.set_j4_rotate(value)
  }

  const set_j5_rotate = (e)=>{
    let value = Number.parseFloat(e.target.value || 0)
    if(Math.abs(value)===180){
      value = value * -1
    }
    props.set_j5_rotate(value)
  }

  const set_j6_rotate = (e)=>{
    let value = Number.parseFloat(e.target.value || 0)
    if(Math.abs(value)===180){
      value = value * -1
    }
    props.set_j6_rotate(value)
  }

  /*const set_j7_rotate = (e)=>{
    let value = Number.parseFloat(e.target.value || 0)
    props.set_j7_rotate(value)
  }*/

  const set_c_pos_x = (e)=>{
    let value = Number.parseFloat(e.target.value || 0)
    props.set_c_pos_x(value)
  }

  const set_c_pos_y = (e)=>{
    let value = Number.parseFloat(e.target.value || 0)
    props.set_c_pos_y(value)
  }

  const set_c_pos_z = (e)=>{
    let value = Number.parseFloat(e.target.value || 0)
    props.set_c_pos_z(value)
  }

  const set_c_deg_x = (e)=>{
    let value = Number.parseFloat(e.target.value || 0)
    props.set_c_deg_x(value)
  }

  const set_c_deg_y = (e)=>{
    let value = Number.parseFloat(e.target.value || 0)
    props.set_c_deg_y(value)
  }

  const set_c_deg_z = (e)=>{
    let value = Number.parseFloat(e.target.value || 0)
    props.set_c_deg_z(value)
  }

  const set_wrist_rot_x = (e)=>{
    let value = Number.parseFloat(e.target.value || 0)
    props.set_wrist_rot_x(normalize180(value))
  }

  const set_wrist_rot_y = (e)=>{
    let value = Number.parseFloat(e.target.value || 0)
    props.set_wrist_rot_y(normalize180(value))
  }

  const set_wrist_rot_z = (e)=>{
    let value = Number.parseFloat(e.target.value || 0)
    props.set_wrist_rot_z(normalize180(value))
  }

  const set_tool_rotate = (e)=>{
    let value = Number.parseFloat(e.target.value || 0)
    props.set_tool_rotate(normalize180(value))
  }

  const set_target_x = (e)=>{
    const value = Number.parseFloat(e.target.value)
    props.set_target({...target,x:value||0})
  }
  const set_target_y = (e)=>{
    const value = Number.parseFloat(e.target.value)
    props.set_target({...target,y:value||0})
  }
  const set_target_z = (e)=>{
    const value = Number.parseFloat(e.target.value)
    props.set_target({...target,z:value||0})
  }

  return (
    <>
      <div className="controller" >
        <div className="row mb-0">
          <div className="col-md-4"><label htmlFor="j1_rotate_number" className="form-label"><span className="form-control-plaintext">J1 Deg</span></label></div>
          <div className="col-md-8"><input type="number" className="form-control" id="j1_rotate_number" value={j1_rotate} onChange={set_j1_rotate} min={-180} max={180}/></div>
        </div>
        <div className="row mb-0">
          <div className="col-md-4"><label htmlFor="j2_rotate_number" className="form-label"><span className="form-control-plaintext">J2 Deg</span></label></div>
          <div className="col-md-8"><input type="number" className="form-control" id="j2_rotate_number" value={j2_rotate} onChange={set_j2_rotate} min={-180} max={180}/></div>
        </div>
        <div className="row mb-0">
          <div className="col-md-4"><label htmlFor="j3_rotate_number" className="form-label"><span className="form-control-plaintext">J3 Deg</span></label></div>
          <div className="col-md-8"><input type="number" className="form-control" id="j3_rotate_number" value={j3_rotate} onChange={set_j3_rotate} min={-180} max={180}/></div>
        </div>
        <div className="row mb-0">
          <div className="col-md-4"><label htmlFor="j4_rotate_number" className="form-label"><span className="form-control-plaintext">J4 Deg</span></label></div>
          <div className="col-md-8"><input type="number" className="form-control" id="j4_rotate_number" value={j4_rotate} onChange={set_j4_rotate} min={-180} max={180}/></div>
        </div>
        <div className="row mb-0">
          <div className="col-md-4"><label htmlFor="j5_rotate_number" className="form-label"><span className="form-control-plaintext">J5 Deg</span></label></div>
          <div className="col-md-8"><input type="number" className="form-control" id="j5_rotate_number" value={j5_rotate} onChange={set_j5_rotate} min={-180} max={180}/></div>
        </div>
        {/*<div className="row mb-2">*/}
        <div className="row mb-0">
          <div className="col-md-4"><label htmlFor="j6_rotate_number" className="form-label"><span className="form-control-plaintext">J6 Deg</span></label></div>
          <div className="col-md-8"><input type="number" className="form-control" id="j6_rotate_number" value={j6_rotate} onChange={set_j6_rotate} min={-180} max={180}/></div>
        </div>
        {/*<div className="row mb-0">
          <div className="col-md-4"><label htmlFor="j7_rotate_number" className="form-label"><span className="form-control-plaintext">Gripper</span></label></div>
          <div className="col-md-8"><input type="number" className="form-control" id="j7_rotate_number" value={j7_rotate} onChange={set_j7_rotate} min={-1} max={89}/></div>
        </div>*/}
        {/*<div className="mb-0">
          <select className="form-select" onChange={set_toolName} value={toolName}>
            {toolNameList.map((name,idx)=><option key={idx} value={name}>{name}</option>)}
          </select>
        </div>*/}
      </div>
      <div className="camera-controller" >
        {vr_mode?null:<><span>CAMERA</span>
        <div className="row mb-0">
          <div className="col-md-4"><label htmlFor="c_pos_x_number" className="form-label"><span className="form-control-plaintext">pos X</span></label></div>
          <div className="col-md-8"><input type="number" className="form-control" id="c_pos_x_number" value={c_pos_x} onChange={set_c_pos_x} step={0.01}/></div>
        </div>
        <div className="row mb-0">
          <div className="col-md-4"><label htmlFor="c_pos_y_number" className="form-label"><span className="form-control-plaintext">pos Y</span></label></div>
          <div className="col-md-8"><input type="number" className="form-control" id="c_pos_y_number" value={c_pos_y} onChange={set_c_pos_y} step={0.01}/></div>
        </div>
        <div className="row mb-2">
          <div className="col-md-4"><label htmlFor="c_pos_z_number" className="form-label"><span className="form-control-plaintext">pos Z</span></label></div>
          <div className="col-md-8"><input type="number" className="form-control" id="c_pos_z_number" value={c_pos_z} onChange={set_c_pos_z} step={0.01}/></div>
        </div>
        <div className="row mb-0">
          <div className="col-md-4"><label htmlFor="c_deg_x_number" className="form-label"><span className="form-control-plaintext">deg X</span></label></div>
          <div className="col-md-8"><input type="number" className="form-control" id="c_deg_x_number" value={c_deg_x} onChange={set_c_deg_x} step={0.1}/></div>
        </div>
        <div className="row mb-0">
          <div className="col-md-4"><label htmlFor="c_deg_y_number" className="form-label"><span className="form-control-plaintext">deg Y</span></label></div>
          <div className="col-md-8"><input type="number" className="form-control" id="c_deg_y_number" value={c_deg_y} onChange={set_c_deg_y} step={0.1}/></div>
        </div>
        <div className="row mb-2">
          <div className="col-md-4"><label htmlFor="c_deg_z_number" className="form-label"><span className="form-control-plaintext">deg Z</span></label></div>
          <div className="col-md-8"><input type="number" className="form-control" id="c_deg_z_number" value={c_deg_z} onChange={set_c_deg_z} step={0.1}/></div>
        </div>
        <div className="row mb-2">
        </div></>}

        <span>ARM DEG</span>
        <div className="row mb-0">
          <div className="col-md-4"><label htmlFor="wrist_rot_x_number" className="form-label"><span className="form-control-plaintext">wrist rot X</span></label></div>
          <div className="col-md-8"><input type="number" className="form-control" id="wrist_rot_x_number" value={wrist_rot_x} onChange={set_wrist_rot_x}/></div>
        </div>
        <div className="row mb-0">
          <div className="col-md-4"><label htmlFor="wrist_rot_y_number" className="form-label"><span className="form-control-plaintext">wrist rot Y</span></label></div>
          <div className="col-md-8"><input type="number" className="form-control" id="wrist_rot_y_number" value={wrist_rot_y} onChange={set_wrist_rot_y}/></div>
        </div>
        <div className="row mb-2">
          <div className="col-md-4"><label htmlFor="wrist_rot_z_number" className="form-label"><span className="form-control-plaintext">wrist rot Z</span></label></div>
          <div className="col-md-8"><input type="number" className="form-control" id="wrist_rot_z_number" value={wrist_rot_z} onChange={set_wrist_rot_z}/></div>
        </div>
        <div className="row mb-2">
          <div className="col-md-4"><label htmlFor="tool_rotate_number" className="form-label"><span className="form-control-plaintext">tool rotate</span></label></div>
          <div className="col-md-8"><input type="number" className="form-control" id="tool_rotate_number" value={tool_rotate} onChange={set_tool_rotate}/></div>
        </div>
        <div className="row mb-2">
        </div>

        <span>TARGET</span>
        <div className="row mb-0">
          <div className="col-md-4"><label htmlFor="target_x_number" className="form-label"><span className="form-control-plaintext">target x</span></label></div>
          <div className="col-md-8"><input type="number" className="form-control" id="target_x_number" value={target.x} onChange={set_target_x} step={0.002} min={-10} max={10}/></div>
        </div>
        <div className="row mb-0">
          <div className="col-md-4"><label htmlFor="target_y_number" className="form-label"><span className="form-control-plaintext">target y</span></label></div>
          <div className="col-md-8"><input type="number" className="form-control" id="target_y_number" value={target.y} onChange={set_target_y} step={0.002} min={-10} max={10}/></div>
        </div>
        <div className="row mb-2">
          <div className="col-md-4"><label htmlFor="target_z_number" className="form-label"><span className="form-control-plaintext">target z</span></label></div>
          <div className="col-md-8"><input type="number" className="form-control" id="target_z_number" value={target.z} onChange={set_target_z} step={0.002} min={-10} max={10}/></div>
        </div>
      </div>
    </>
    )
}
