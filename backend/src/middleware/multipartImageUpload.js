const MAX_BODY_SIZE_BYTES = 6 * 1024 * 1024;

function createError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function parseMultipartBody(buffer, boundary) {
  const delimiter = Buffer.from(`--${boundary}`);
  const nextDelimiter = Buffer.from(`\r\n--${boundary}`);
  const headerSeparator = Buffer.from('\r\n\r\n');
  const fields = {};
  let file = null;
  let cursor = buffer.indexOf(delimiter);
  if (cursor === -1) throw createError(400, 'Malformed multipart body');

  while (cursor < buffer.length) {
    cursor += delimiter.length;
    if (buffer.toString('ascii', cursor, cursor + 2) === '--') break;
    if (buffer.toString('ascii', cursor, cursor + 2) !== '\r\n') throw createError(400, 'Malformed multipart body');
    cursor += 2;
    const separatorIndex = buffer.indexOf(headerSeparator, cursor);
    if (separatorIndex === -1) throw createError(400, 'Malformed multipart headers');
    const rawHeaders = buffer.toString('latin1', cursor, separatorIndex);
    const contentStart = separatorIndex + headerSeparator.length;
    const nextPart = buffer.indexOf(nextDelimiter, contentStart);
    if (nextPart === -1) throw createError(400, 'Malformed multipart body');
    const content = buffer.subarray(contentStart, nextPart);
    const nameMatch = rawHeaders.match(/name="([^"]+)"/i);
    if (nameMatch) {
      const fieldName = nameMatch[1];
      const filenameMatch = rawHeaders.match(/filename="([^"]*)"/i);
      if (filenameMatch) {
        file = { fieldname: fieldName, originalname: filenameMatch[1], buffer: Buffer.from(content) };
      } else {
        fields[fieldName] = content.toString('utf8');
      }
    }
    cursor = nextPart + 2;
  }

  return { fields, file };
}

function multipartImageUpload(req, res, next) {
  const contentType = req.headers['content-type'] || '';
  const boundaryMatch = contentType.match(/boundary=([^;]+)/i);
  if (!contentType.toLowerCase().startsWith('multipart/form-data') || !boundaryMatch) {
    return next(createError(400, 'multipart/form-data body is required'));
  }

  const chunks = [];
  let totalSize = 0;

  req.on('data', (chunk) => {
    totalSize += chunk.length;
    if (totalSize > MAX_BODY_SIZE_BYTES) {
      req.destroy(createError(400, 'request body must be 6MB or smaller'));
      return;
    }
    chunks.push(chunk);
  });

  req.on('end', () => {
    try {
      const boundary = boundaryMatch[1].trim().replace(/^["']|["']$/g, '');
      if (!boundary) throw createError(400, 'Invalid multipart boundary');
      const { fields, file } = parseMultipartBody(Buffer.concat(chunks), boundary);
      req.body = fields;
      req.file = file;
      next();
    } catch (error) {
      next(error);
    }
  });

  req.on('error', next);
}

module.exports = multipartImageUpload;
