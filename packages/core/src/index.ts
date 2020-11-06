import 'reflect-metadata';
import { Component, ComponentManager } from './ComponentManager';
import { FrameGraphSystem } from './components/framegraph/System';
import { GeometryComponent } from './components/geometry/GeometryComponent';
import { IBoxGeometryParams } from './components/geometry/interface';
import { GeometrySystem } from './components/geometry/System';
// import { InteractionSystem } from './components/interaction/System';
import { IUniformBinding } from './components/material/interface';
import { MaterialComponent } from './components/material/MaterialComponent';
import { MaterialSystem } from './components/material/System';
import { CullableComponent } from './components/mesh/CullableComponent';
import { IMeshParams } from './components/mesh/interface';
import { MeshComponent } from './components/mesh/MeshComponent';
import { MeshSystem } from './components/mesh/System';
import { SceneGraphSystem } from './components/scenegraph/System';
import { TransformComponent } from './components/scenegraph/TransformComponent';

import { gl } from './components/renderer/gl';
import {
  IAttribute,
  IAttributeInitializationOptions,
} from './components/renderer/IAttribute';
import {
  IBuffer,
  IBufferInitializationOptions,
} from './components/renderer/IBuffer';
import { IComputeModel } from './components/renderer/IComputeModel';
import {
  IElements,
  IElementsInitializationOptions,
} from './components/renderer/IElements';
import {
  IFramebuffer,
  IFramebufferInitializationOptions,
} from './components/renderer/IFramebuffer';
import {
  IModel,
  IModelDrawOptions,
  IModelInitializationOptions,
} from './components/renderer/IModel';
import {
  IRenderbuffer,
  IRenderbufferInitializationOptions,
} from './components/renderer/IRenderbuffer';
import {
  BufferData,
  IClearOptions,
  IReadPixelsOptions,
  IRendererConfig,
  IRendererService,
  IView,
  IScene,
  IViewport,
  ICamera,
} from './components/renderer/IRendererService';
import {
  ITexture2D,
  ITexture2DInitializationOptions,
} from './components/renderer/ITexture2D';
import { IUniform } from './components/renderer/IUniform';

import { PixelPickingPass } from './components/renderer/passes/PixelPickingPass';
import { createEntity } from './Entity';
import { IDENTIFIER } from './identifier';
import {
  container,
  createContainerModule,
  lazyInject,
  lazyMultiInject,
} from './inversify.config';
import { ISystem } from './ISystem';
import { IConfig, IConfigService } from './services/config/IConfigService';
import { IShaderModuleService } from './services/shader-module/IShaderModuleService';
import { isSafari } from './utils/isSafari';
import { Frustum } from './shape/Frustum';

type Entity = number;

enum AST_TOKEN_TYPES {
  Void = 'Void',
  Boolean = 'Boolean',
  Float = 'Float',
  Uint32 = 'Uint32',
  Int32 = 'Int32',
  Vector = 'Vector',
  Vector2Float = 'vec2<f32>',
  Vector3Float = 'vec3<f32>',
  Vector4Float = 'vec4<f32>',
  Vector2Boolean = 'vec2<bool>',
  Vector3Boolean = 'vec3<bool>',
  Vector4Boolean = 'vec4<bool>',
  Vector2Uint = 'vec2<u32>',
  Vector3Uint = 'vec3<u32>',
  Vector4Uint = 'vec4<u32>',
  Vector2Int = 'vec2<i32>',
  Vector3Int = 'vec3<i32>',
  Vector4Int = 'vec4<i32>',
  Matrix = 'Matrix',
  Matrix3x3Float = 'mat3x3<f32>',
  Matrix4x4Float = 'mat4x4<i32>',
  Struct = 'Struct',
  FloatArray = 'Float[]',
  Vector4FloatArray = 'vec4<f32>[]',
}

enum AST_NODE_TYPES {
  Program = 'Program',
  Identifier = 'Identifier',
  VariableDeclaration = 'VariableDeclaration',
  BlockStatement = 'BlockStatement',
  ReturnStatement = 'ReturnStatement',
  FunctionDeclaration = 'FunctionDeclaration',
  VariableDeclarator = 'VariableDeclarator',
  AssignmentExpression = 'AssignmentExpression',
  LogicalExpression = 'LogicalExpression',
  BinaryExpression = 'BinaryExpression',
  ArrayExpression = 'ArrayExpression',
  UnaryExpression = 'UnaryExpression',
  UpdateExpression = 'UpdateExpression',
  FunctionExpression = 'FunctionExpression',
  MemberExpression = 'MemberExpression',
  ConditionalExpression = 'ConditionalExpression',
  ExpressionStatement = 'ExpressionStatement',
  CallExpression = 'CallExpression',
  NumThreadStatement = 'NumThreadStatement',
  StorageStatement = 'StorageStatement',
  DoWhileStatement = 'DoWhileStatement',
  WhileStatement = 'WhileStatement',
  ForStatement = 'ForStatement',
  BreakStatement = 'BreakStatement',
  ContinueStatement = 'ContinueStatement',
  IfStatement = 'IfStatement',
  ImportedFunctionStatement = 'ImportedFunctionStatement',
}

enum STORAGE_CLASS {
  Input = 'Input',
  Output = 'Output',
  Uniform = 'Uniform',
  Workgroup = 'Workgroup',
  UniformConstant = 'UniformConstant',
  Image = 'Image',
  StorageBuffer = 'StorageBuffer',
  Private = 'Private',
  Function = 'Function',
}

type TypedArrayConstructor =
  | Int8ArrayConstructor
  | Uint8ArrayConstructor
  | Uint8ClampedArrayConstructor
  | Int16ArrayConstructor
  | Uint16ArrayConstructor
  | Int32ArrayConstructor
  | Uint32ArrayConstructor
  | Float32ArrayConstructor
  | Float64ArrayConstructor;

type DataType =
  | AST_TOKEN_TYPES.Uint32
  | AST_TOKEN_TYPES.Int32
  | AST_TOKEN_TYPES.Boolean
  | AST_TOKEN_TYPES.Float
  | AST_TOKEN_TYPES.Vector2Float
  | AST_TOKEN_TYPES.Vector3Float
  | AST_TOKEN_TYPES.Vector4Float
  | AST_TOKEN_TYPES.Vector2Int
  | AST_TOKEN_TYPES.Vector3Int
  | AST_TOKEN_TYPES.Vector4Int
  | AST_TOKEN_TYPES.Vector2Uint
  | AST_TOKEN_TYPES.Vector3Uint
  | AST_TOKEN_TYPES.Vector4Uint
  | AST_TOKEN_TYPES.Vector2Boolean
  | AST_TOKEN_TYPES.Vector3Boolean
  | AST_TOKEN_TYPES.Vector4Boolean
  | AST_TOKEN_TYPES.Matrix3x3Float
  | AST_TOKEN_TYPES.Matrix4x4Float
  | AST_TOKEN_TYPES.FloatArray
  | AST_TOKEN_TYPES.Vector4FloatArray
  | AST_TOKEN_TYPES.Void;

interface GLSLContext {
  /**
   * 程序名
   */
  name: string;

  shader?: string;
  /**
   * size of thread grid
   * 即 WebGL 2 Compute 中的 dispatchCompute
   * 或者 WebGPU 中的 dispatch
   */
  dispatch: [number, number, number];
  /**
   * size of each thread group
   * Compute Shader 中的 local_size_x/y/z
   */
  threadGroupSize: [number, number, number];
  /**
   * 迭代次数，例如布局运算中需要迭代很多次才能到达稳定
   */
  maxIteration: number;
  /**
   * 是否需要 pingpong，如果存在输入和输出为同一个的情况
   */
  needPingpong: boolean;
  /**
   * 目前仅支持单一输出，受限于 WebGL 实现
   */
  output: {
    name: string;
    size?: [number, number];
    textureSize?: [number, number];
    length?: number;
    typedArrayConstructor?: TypedArrayConstructor;
    gpuBuffer?: GPUBuffer;
    outputElementsPerTexel?: number;
  };
  /**
   * 常量，可分成编译时和运行时两类：
   * 1. 编译时即可确定值
   * 2. 运行时：例如循环长度需要为常量，但在编译时又无法确定
   * TODO 支持定义函数，例如 tensorflow 中的 DIV_CEIL
   */
  defines: Array<{
    name: string;
    type: DataType;
    value: number;
    runtime: boolean; // 是否是运行时生成
  }>;
  globalDeclarations: Array<{
    name: string;
    type: DataType;
    value: string;
    shared: boolean;
  }>;
  uniforms: Array<{
    name: string;
    type: DataType;
    data?:
      | number
      | number[]
      | Float32Array
      | Uint8Array
      | Uint16Array
      | Uint32Array
      | Int8Array
      | Int16Array
      | Int32Array;
    size?: [number, number];
    storageClass: STORAGE_CLASS;
    readonly: boolean;
    writeonly: boolean;
    isReferer?: boolean;
  }>;
}

/**
 * 根据目标平台生成 Shader 代码
 * * WebGL GLSL 1.0
 * * WebGPU Chrome/Edge GLSL 4.5 & WGSL @see https://gpuweb.github.io/gpuweb/wgsl.html
 * * Safari WHLSL (maybe deprecated)
 */
enum Target {
  GLSL100 = 'GLSL100',
  GLSL450 = 'GLSL450',
  WGSL = 'WGSL',
}

const DefineValuePlaceholder = '__DefineValuePlaceholder__';

interface KernelBundle {
  shaders: {
    [Target.WGSL]: string;
    [Target.GLSL450]: string;
    [Target.GLSL100]: string;
  };
  context?: GLSLContext;
  toString(): string;
}

export {
  container,
  createContainerModule,
  lazyInject,
  lazyMultiInject,
  createEntity,
  Component,
  ComponentManager,
  Entity,
  ISystem,
  IBoxGeometryParams,
  IUniform,
  IMeshParams,
  IUniformBinding,
  IDENTIFIER,
  FrameGraphSystem,
  GeometrySystem,
  // InteractionSystem,
  MaterialSystem,
  MeshSystem,
  SceneGraphSystem,
  CullableComponent,
  MeshComponent,
  TransformComponent,
  MaterialComponent,
  GeometryComponent,
  isSafari,
  // renderer service
  gl,
  IAttribute,
  IAttributeInitializationOptions,
  IBuffer,
  IBufferInitializationOptions,
  IClearOptions,
  IElements,
  IElementsInitializationOptions,
  IFramebuffer,
  IFramebufferInitializationOptions,
  IRenderbuffer,
  IRenderbufferInitializationOptions,
  IModel,
  IModelInitializationOptions,
  IModelDrawOptions,
  IReadPixelsOptions,
  IRendererConfig,
  IRendererService,
  ITexture2D,
  ITexture2DInitializationOptions,
  IComputeModel,
  BufferData,
  IShaderModuleService,
  IConfigService,
  IConfig,
  PixelPickingPass,
  AST_TOKEN_TYPES,
  AST_NODE_TYPES,
  STORAGE_CLASS,
  GLSLContext,
  DataType,
  Target,
  DefineValuePlaceholder,
  KernelBundle,
  Frustum,
  IView,
  IScene,
  IViewport,
  ICamera,
};
