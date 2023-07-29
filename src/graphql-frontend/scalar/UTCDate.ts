import { Kind } from 'graphql/language';
import { GraphQLScalarType } from 'graphql';
import { format } from 'date-fns';

const FORMAT_STRING = "yyyy-MM-dd'T'HH:mm:ss";

function serializeDate(value) {
  if (value instanceof Date) {
    return format(value, FORMAT_STRING);
  } else if (typeof value === 'string') {
    return format(new Date(Date.parse(value)), FORMAT_STRING);
  }
  return null;
}

function parseDate(value) {
  if (value === null) {
    return null;
  }

  try {
    return new Date(value);
  } catch (err) {
    return null;
  }
}

function parseDateFromLiteral(ast) {
  if (ast.kind === Kind.INT) {
    const num = parseInt(ast.value, 10);
    return new Date(num);
  } else if (ast.kind === Kind.STRING) {
    return parseDate(ast.value);
  }
  return null;
}

const UTCDate = new GraphQLScalarType({
  name: 'UTCDate',
  description: 'The javascript `Date`',
  serialize: serializeDate,
  parseValue: parseDate,
  parseLiteral: parseDateFromLiteral,
});

export default UTCDate;
