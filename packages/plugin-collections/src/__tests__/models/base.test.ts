import Database, { ModelCtor } from '@nocobase/database';
import { getDatabase } from '../';
import BaseModel from '../../models/base';
import _ from 'lodash';

describe('models.base', () => {
  let database: Database;
  let TestModel: ModelCtor<BaseModel>;
  let test: BaseModel;
  beforeEach(async () => {
    database = getDatabase();
    database.table({
      name: 'tests',
      model: BaseModel,
      additionalAttribute: 'options',
      fields: [
        {
          name: 'name',
          type: 'string',
        },
        {
          name: 'title',
          type: 'virtual',
        },
        {
          name: 'xyz',
          type: 'virtual',
          defaultValue: 'xyz1',
        },
        {
          name: 'content',
          type: 'virtual',
          set(val) {
            // 留空
          }
        },
        {
          name: 'key1',
          type: 'virtual',
          set(val) {
            this.setDataValue('options.key1', `111${val}111`);
          }
        },
        {
          name: 'key2',
          type: 'virtual',
          get() {
            return 'val2';
          }
        },
        {
          type: 'json',
          name: 'component',
          defaultValue: {},
        },
        {
          type: 'json',
          name: 'options',
          defaultValue: {},
        },
      ],
    });
    await database.sync();
    TestModel = database.getModel('tests') as ModelCtor<BaseModel>;
    test = await TestModel.create({
      name: '123',
      abc: { aa: 'aa' },
      'abc.bb': 'bb',
      component: {
        a: 'a',
      },
      'component.b': 'b',
      options: {
        bcd: 'bbb',
      },
      arr: [{ a: 'a' }, { b: 'b' }],
    });
  });

  afterEach(() => database.close());

  it('get all attribute', async () => {
    // 获取所有字段
    expect(test.get()).toMatchObject({
      abc: { aa: 'aa', bb: 'bb' },
      bcd: 'bbb',
      name: '123',
      component: { a: 'a', b: 'b' },
      arr: [{ a: 'a' }, { b: 'b' }],
    });
  });

  it('get options attribute', async () => {
    // 直接取 options 字段
    expect(test.get('options')).toEqual({
      abc: {
        aa: 'aa',
        bb: 'bb',
      },
      bcd: 'bbb',
      xyz: "xyz1",
      arr: [{ a: 'a' }, { b: 'b' }],
    });
  });

  it('get component attribute', async () => {
    expect(test.get('component')).toEqual({ a: 'a', b: 'b' });
  });

  it('set component attribute with dot key', async () => {
    test.set('component.c', 'c');
    await test.save();
    expect(test.get()).toMatchObject({
      abc: { aa: 'aa', bb: 'bb' },
      bcd: 'bbb',
      name: '123',
      component: { a: 'a', b: 'b' },
      arr: [{ a: 'a' }, { b: 'b' }],
    });
    expect(test.get('component')).toEqual({ a: 'a', b: 'b', c: 'c' });
  });

  it('set options attribute with dot key', async () => {
    test.set('options.cccc', 'cccc');
    await test.save();
    expect(test.get()).toMatchObject({
      abc: { aa: 'aa', bb: 'bb' },
      bcd: 'bbb',
      name: '123',
      cccc: 'cccc',
      component: { a: 'a', b: 'b' },
      arr: [{ a: 'a' }, { b: 'b' }],
    });
  });

  it('set options attribute without options prefix', async () => {
    test.set('dddd', 'dddd');
    await test.save();
    expect(test.get()).toMatchObject({
      abc: { aa: 'aa', bb: 'bb' },
      bcd: 'bbb',
      name: '123',
      dddd: 'dddd',
      component: { a: 'a', b: 'b' },
      arr: [{ a: 'a' }, { b: 'b' }],
    });
  });

  it('refind', async () => {
    test.set('component.c', 'c');
    await test.save();
    // 重新查询
    const test2 = await TestModel.findByPk(test.id);
    expect(test2.get()).toMatchObject({
      abc: { aa: 'aa', bb: 'bb' },
      bcd: 'bbb',
      name: '123',
      component: { a: 'a', b: 'b', c: 'c' },
      arr: [{ a: 'a' }, { b: 'b' }],
    });
    expect(test2.get('component')).toEqual({ a: 'a', b: 'b', c: 'c' });
  });

  it('update', async () => {
    await test.update({
      'name123': 'xxx',
      'component.d': 'd',
    });
    expect(test.get()).toMatchObject({
      abc: { aa: 'aa', bb: 'bb' },
      bcd: 'bbb',
      name: '123',
      name123: 'xxx',
      component: { a: 'a', b: 'b', d: 'd' },
      arr: [{ a: 'a' }, { b: 'b' }],
    });
  });

  it('update virtual attribute', async () => {
    await test.update({
      title: 'xxx', // 虚拟字段没 set 转存 options
      content: 'content123', // set 留空，这个 key 什么也不做
      key1: 'val1', // 走 set 方法
    });
    // 重新获取再验证
    const test2 = await TestModel.findByPk(test.id);
    expect(test2.get()).toMatchObject({
      abc: { aa: 'aa', bb: 'bb' },
      bcd: 'bbb',
      name: '123',
      component: { a: 'a', b: 'b' },
      arr: [{ a: 'a' }, { b: 'b' }],
      title: 'xxx',
      key2: 'val2', // key2 为 get 方法取的
      key1: '111val1111',
    });
    expect(test2.get('content')).toBeUndefined();
  });

  it('update', async () => {
    const t = await TestModel.create({
      name: 'name1',
      // xyz: 'xyz',
    });
    await t.update({
      abc: 'abc',
    });
    const t2 = await TestModel.findOne({
      where: {
        name: 'name1',
      }
    });
    expect(t2.get()).toMatchObject({
      xyz: 'xyz1',
      abc: 'abc',
      key2: 'val2',
      id: 2,
      name: 'name1',
    });
    await t2.update({
      abc: 'abcdef',
    });
    const t3 = await TestModel.findOne({
      where: {
        name: 'name1',
      }
    });
    // 查询之后更新再重新查询
    expect(t3.get()).toMatchObject({
      xyz: 'xyz1',
      abc: 'abcdef',
      key2: 'val2',
      id: 2,
      name: 'name1',
    });
  });

  it('update', async () => {
    const t = await TestModel.create({
      name: 'name1',
      xyz: 'xyz',
    });
    await t.update({
      abc: 'abc',
    });
    const t2 = await TestModel.findOne({
      where: {
        name: 'name1',
      }
    });
    expect(t2.get()).toMatchObject({
      xyz: 'xyz',
      abc: 'abc',
      key2: 'val2',
      id: 2,
      name: 'name1',
    });
  });

  it('component', async () => {
    const t = await TestModel.create({
      component: {
        arr: [
          { a: 'a', aa: 'aa' },
          { b: 'b', bb: 'bb' },
          { c: 'c', cc: 'cc' },
        ],
      },
    });
    t.set({
      component: {
        arr: [
          { a: 'aa' },
          { b: 'bb' },
        ],
      }
    });
    await t.save();
    expect(t.get('component')).toEqual({
      arr: [
        { a: 'aa' },
        { b: 'bb' },
      ],
    });
  })
});
