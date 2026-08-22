# -*- coding: utf-8 -*-
"""
Vendored copy of Lazada Open Platform's official `lazop-sdk-python`
(version string below, originally downloaded 2018-12-07 from Lazada's Open
Platform SDK page — it isn't published to PyPI, so vendoring is Lazada's own
documented install method). Patched for this project only where the original
would break under Python 3.12 / a container:
  - Dropped the import-time `~/logs/...` file log handler (wrote outside the
    container's working dirs and crashed if $HOME wasn't writable); errors
    are now just raised to the caller, who logs them the way the rest of
    this Django app does.
  - Dropped the Python 2 `unicode` branch in mixStr() (undefined name under
    Python 3 — would NameError the first time a non-str value hit it).
Signing (`sign()`) and request execution (`LazopClient.execute`) are
unchanged from upstream.
"""

import hashlib
import hmac
import time

import requests

P_SDK_VERSION = "lazop-sdk-python-20181207"

P_APPKEY = "app_key"
P_ACCESS_TOKEN = "access_token"
P_TIMESTAMP = "timestamp"
P_SIGN = "sign"
P_SIGN_METHOD = "sign_method"
P_PARTNER_ID = "partner_id"
P_DEBUG = "debug"

P_CODE = 'code'
P_TYPE = 'type'
P_MESSAGE = 'message'
P_REQUEST_ID = 'request_id'


def sign(secret, api, parameters):
    sort_dict = sorted(parameters)

    parameters_str = "%s%s" % (
        api,
        str().join('%s%s' % (key, parameters[key]) for key in sort_dict),
    )

    h = hmac.new(secret.encode(encoding="utf-8"), parameters_str.encode(encoding="utf-8"), digestmod=hashlib.sha256)

    return h.hexdigest().upper()


def mixStr(pstr):
    if isinstance(pstr, str):
        return pstr
    return str(pstr)


class LazopRequest(object):
    def __init__(self, api_pame, http_method='POST'):
        self._api_params = {}
        self._file_params = {}
        self._api_pame = api_pame
        self._http_method = http_method

    def add_api_param(self, key, value):
        self._api_params[key] = value

    def add_file_param(self, key, value):
        self._file_params[key] = value


class LazopResponse(object):
    def __init__(self):
        self.type = None
        self.code = None
        self.message = None
        self.request_id = None
        self.body = None

    def __str__(self, *args, **kwargs):
        sb = "type=" + mixStr(self.type) + \
            " code=" + mixStr(self.code) + \
            " message=" + mixStr(self.message) + \
            " requestId=" + mixStr(self.request_id)
        return sb


class LazopClient(object):

    def __init__(self, server_url, app_key, app_secret, timeout=30):
        self._server_url = server_url
        self._app_key = app_key
        self._app_secret = app_secret
        self._timeout = timeout

    def execute(self, request, access_token=None):
        sys_parameters = {
            P_APPKEY: self._app_key,
            P_SIGN_METHOD: "sha256",
            P_TIMESTAMP: str(int(round(time.time()))) + '000',
            P_PARTNER_ID: P_SDK_VERSION,
        }

        if access_token:
            sys_parameters[P_ACCESS_TOKEN] = access_token

        application_parameter = request._api_params

        sign_parameter = sys_parameters.copy()
        sign_parameter.update(application_parameter)

        sign_parameter[P_SIGN] = sign(self._app_secret, request._api_pame, sign_parameter)

        api_url = "%s%s" % (self._server_url, request._api_pame)

        if request._http_method == 'POST' or len(request._file_params) != 0:
            r = requests.post(api_url, sign_parameter, files=request._file_params, timeout=self._timeout)
        else:
            r = requests.get(api_url, sign_parameter, timeout=self._timeout)

        response = LazopResponse()

        jsonobj = r.json()

        if P_CODE in jsonobj:
            response.code = jsonobj[P_CODE]
        if P_TYPE in jsonobj:
            response.type = jsonobj[P_TYPE]
        if P_MESSAGE in jsonobj:
            response.message = jsonobj[P_MESSAGE]
        if P_REQUEST_ID in jsonobj:
            response.request_id = jsonobj[P_REQUEST_ID]

        response.body = jsonobj

        return response
