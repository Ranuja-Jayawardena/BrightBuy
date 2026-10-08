const MAX_BODY_SIZE_BYTES = 6 * 1024 * 1024;

function createError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function parseMultipartBody(buffer, boundary) {
  const body = buffer.toString('latin1');
  const delimiter = `--${boundary}`;
  const parts = body.split(delimiter).slice(1, -1);
  const fields = {};
  let file = null;

  for (const part of parts) {
    const trimmed = part.replace(/^\r\n/, '').replace(/\r\n$/, '');
    const separatorIndex = trimmed.indexOf('\r\n\r\n');
    if (separatorIndex === -1) {
      continue;
    }

    const rawHeaders = trimmed.slice(0, separatorIndex);
    const content = trimmed.slice(separatorIndex + 4);
    const nameMatch = rawHeaders.match(/name="([^"]+)"/i);
    if (!nameMatch) {
      continue;
    }

    const fieldName = nameMatch[1];
    const filenameMatch = rawHeaders.match(/filename="([^"]*)"/i);
    if (filenameMatch) {
      file = {
        fieldname: fieldName,
        originalname: filenameMatch[1],
        buffer: Buffer.from(content, 'latin1'),
      };
    } else {
      fields[fieldName] = content;
    }
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
      const { fields, file } = parseMultipartBody(Buffer.concat(chunks), boundaryMatch[1]);
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
