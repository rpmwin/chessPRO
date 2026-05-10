{{- define "chesspro.name" -}}
{{- .Chart.Name }}
{{- end }}

{{- define "chesspro.backend.fullname" -}}
{{- printf "%s-backend" .Release.Name }}
{{- end }}

{{- define "chesspro.frontend.fullname" -}}
{{- printf "%s-frontend" .Release.Name }}
{{- end }}

{{- define "chesspro.labels" -}}
app.kubernetes.io/name: {{ include "chesspro.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
{{- end }}
