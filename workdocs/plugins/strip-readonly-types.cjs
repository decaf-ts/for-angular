exports.handlers = {
  beforeParse: function (e) {
    if (typeof e.source !== "string") {
      return;
    }
    e.source = e.source
      .replace(/@(param|return|type|typedef|property) \{readonly /g, "@$1 {")
      .replace(/@(param|return|type|typedef|property) \{Array<readonly /g, "@$1 {Array<")
      .replace(
        /@(param|return|type|typedef|property) \{([A-Za-z_$][\w$.]*)\["([^"\]]+)"\]\}/g,
        "@$1 {$2.$3}"
      )
      .replace(
        /@(param|return|type|typedef|property) \{([^{}@]+)\}/g,
        function (match, tag, type) {
          const fixed = type
            .replace(/^[A-Za-z_$][\w$.]*\s+is\s+/, "")
            .replace(
              /([A-Za-z_$][\w$.]*)\[("([^"\]]+)"|'([^'\]]+)')\]/g,
              "$1.$3$4"
            );
          return fixed === type ? match : "@".concat(tag, " {", fixed, "}");
        }
      );
  },
};
