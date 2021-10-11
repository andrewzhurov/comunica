import { ActorQueryOperation, Bindings } from '@comunica/bus-query-operation';
import { Bus } from '@comunica/core';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { Algebra, Factory } from 'sparqlalgebrajs';
import { ActorQueryOperationPathAlt } from '../lib/ActorQueryOperationPathAlt';
const arrayifyStream = require('arrayify-stream');
const DF = new DataFactory();

describe('ActorQueryOperationPathAlt', () => {
  let bus: any;
  let mediatorQueryOperation: any;
  const factory: Factory = new Factory();

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          Bindings({ '?x': DF.literal('1') }),
          Bindings({ '?x': DF.literal('2') }),
          Bindings({ '?x': DF.literal('3') }),
        ]),
        metadata: () => Promise.resolve({ cardinality: 3 }),
        operated: arg,
        type: 'bindings',
        variables: [ 'a' ],
        canContainUndefs: false,
      }),
    };
  });

  describe('ActorQueryOperationPathAlt#unionMetadata', () => {
    it('should return 0 items for an empty input', () => {
      return expect(ActorQueryOperationPathAlt.unionMetadata([])).toEqual({ cardinality: 0 });
    });

    it('should return 1 items for a single input with 1', () => {
      return expect(ActorQueryOperationPathAlt.unionMetadata([{ cardinality: 1 }])).toEqual({ cardinality: 1 });
    });

    it('should return 0 items for a single input with 0', () => {
      return expect(ActorQueryOperationPathAlt.unionMetadata([{ cardinality: 0 }])).toEqual({ cardinality: 0 });
    });

    it('should return infinite items for a single input with Infinity', () => {
      return expect(ActorQueryOperationPathAlt.unionMetadata([{ cardinality: Number.POSITIVE_INFINITY }]))
        .toEqual({ cardinality: Number.POSITIVE_INFINITY });
    });

    it('should return infinite items for a single empty input', () => {
      return expect(ActorQueryOperationPathAlt.unionMetadata([{}]))
        .toEqual({ cardinality: Number.POSITIVE_INFINITY });
    });

    it('should return infinite items for a single input without items', () => {
      return expect(ActorQueryOperationPathAlt.unionMetadata([{ something: 'abc' }]))
        .toEqual({ cardinality: Number.POSITIVE_INFINITY });
    });

    it('should return 3 items for inputs with 1 and 2', () => {
      return expect(ActorQueryOperationPathAlt.unionMetadata([{ cardinality: 1 }, { cardinality: 2 }]))
        .toEqual({ cardinality: 3 });
    });

    it('should return infinite items for inputs with Infinity and 2', () => {
      return expect(ActorQueryOperationPathAlt
        .unionMetadata([{ cardinality: Number.POSITIVE_INFINITY }, { cardinality: 2 }]))
        .toEqual({ cardinality: Number.POSITIVE_INFINITY });
    });

    it('should return infinite items for inputs with 1 and Infinity', () => {
      return expect(ActorQueryOperationPathAlt
        .unionMetadata([{ cardinality: 1 }, { cardinality: Number.POSITIVE_INFINITY }]))
        .toEqual({ cardinality: Number.POSITIVE_INFINITY });
    });

    it('should return infinite items for inputs with Infinity and Infinity', () => {
      return expect(ActorQueryOperationPathAlt
        .unionMetadata([{ cardinality: Number.POSITIVE_INFINITY }, { cardinality: Number.POSITIVE_INFINITY }]))
        .toEqual({ cardinality: Number.POSITIVE_INFINITY });
    });

    it('should return infinite items for inputs with empty and 2', () => {
      return expect(ActorQueryOperationPathAlt.unionMetadata([{}, { cardinality: 2 }]))
        .toEqual({ cardinality: Number.POSITIVE_INFINITY });
    });

    it('should return infinite items for inputs with 1 and empty', () => {
      return expect(ActorQueryOperationPathAlt.unionMetadata([{ cardinality: 1 }, {}]))
        .toEqual({ cardinality: Number.POSITIVE_INFINITY });
    });

    it('should return infinite items for inputs with empty and empty', () => {
      return expect(ActorQueryOperationPathAlt.unionMetadata([{}, {}]))
        .toEqual({ cardinality: Number.POSITIVE_INFINITY });
    });
  });

  describe('The ActorQueryOperationPathAlt module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationPathAlt).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationPathAlt constructor', () => {
      expect(new (<any> ActorQueryOperationPathAlt)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperationPathAlt);
      expect(new (<any> ActorQueryOperationPathAlt)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationPathAlt objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperationPathAlt)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationPathAlt instance', () => {
    let actor: ActorQueryOperationPathAlt;

    beforeEach(() => {
      actor = new ActorQueryOperationPathAlt({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should test on Alt paths', () => {
      const op: any = { operation: { type: Algebra.types.PATH, predicate: { type: Algebra.types.ALT }}};
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should test on different paths', () => {
      const op: any = { operation: { type: Algebra.types.PATH, predicate: { type: 'dummy' }}};
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should not test on non-leftjoin', () => {
      const op: any = { operation: { type: 'some-other-type' }};
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should support Alt paths', async() => {
      const op: any = { operation: factory.createPath(
        DF.namedNode('s'),
        factory.createAlt([
          factory.createLink(DF.namedNode('p1')),
          factory.createLink(DF.namedNode('p2')),
        ]),
        DF.variable('x'),
      ) };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      expect(output.canContainUndefs).toEqual(false);
      expect(await output.metadata!()).toEqual({ cardinality: 6 });
      expect(await arrayifyStream(output.bindingsStream)).toEqual([
        Bindings({ '?x': DF.literal('1') }),
        Bindings({ '?x': DF.literal('1') }),
        Bindings({ '?x': DF.literal('2') }),
        Bindings({ '?x': DF.literal('2') }),
        Bindings({ '?x': DF.literal('3') }),
        Bindings({ '?x': DF.literal('3') }),
      ]);
    });

    it('should support Alt paths when the children have no metadata', async() => {
      mediatorQueryOperation.mediate = (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          Bindings({ '?x': DF.literal('1') }),
          Bindings({ '?x': DF.literal('2') }),
          Bindings({ '?x': DF.literal('3') }),
        ]),
        operated: arg,
        type: 'bindings',
        variables: [ 'a' ],
        canContainUndefs: false,
      });

      const op: any = {
        operation: factory.createPath(
          DF.namedNode('s'),
          factory.createAlt([
            factory.createLink(DF.namedNode('p1')),
            factory.createLink(DF.namedNode('p2')),
          ]),
          DF.variable('x'),
        ),
      };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      expect(output.canContainUndefs).toEqual(false);
      expect(output.metadata).toBeUndefined();
      expect(await arrayifyStream(output.bindingsStream)).toEqual([
        Bindings({ '?x': DF.literal('1') }),
        Bindings({ '?x': DF.literal('1') }),
        Bindings({ '?x': DF.literal('2') }),
        Bindings({ '?x': DF.literal('2') }),
        Bindings({ '?x': DF.literal('3') }),
        Bindings({ '?x': DF.literal('3') }),
      ]);
    });
  });
});
